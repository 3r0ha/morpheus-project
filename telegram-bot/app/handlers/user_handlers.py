import json
import re

from aiogram import Bot, Router, F
from aiogram.enums import ChatAction
from aiogram.exceptions import TelegramBadRequest
from aiogram.filters import CommandStart, StateFilter
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery, Message, WebAppInfo
from aiogram.utils.keyboard import InlineKeyboardBuilder

from app.keyboards.inline_keyboards import (
    create_history_keyboard,
    get_profile_keyboard,
    get_onboarding_keyboard,
    get_session_view_keyboard,
    get_confirm_delete_keyboard
)
from app.keyboards.reply_keyboards import get_main_menu, get_dialog_menu
from app.services.api_client import api_client
from app.states import ChatStates 

router = Router()

WEB_APP_URL = "https://morpheusantihype.icu"


def escape_markdown_v2(text: str) -> str:
    if not isinstance(text, str):
        return ""
    escape_chars = r"_*[]()~`>#+-=|{}.!"
    return re.sub(f"([{re.escape(escape_chars)}])", r"\\\1", text)


@router.message(CommandStart())
async def command_start_handler(message: Message, state: FSMContext):
    await state.clear()
    telegram_id = message.from_user.id
    user_data = await api_client.find_user_by_telegram_id(telegram_id)

    if user_data:
        await message.answer(
            f"С возвращением, {user_data.get('name', message.from_user.first_name)}! Что будем делать?",
            reply_markup=get_main_menu(),
        )
    else:
        await message.answer(
            "Привет! Чтобы пользоваться сонником, пожалуйста, войди или зарегистрируйся на нашем сайте. Это нужно сделать один раз.",
            reply_markup=get_onboarding_keyboard(),
        )


@router.message(F.text == "👤 Профиль", StateFilter(None))
async def profile_button_handler(message: Message, bot: Bot):
    await bot.send_chat_action(chat_id=message.chat.id, action=ChatAction.TYPING)
    telegram_id = message.from_user.id
    profile_data = await api_client.find_user_by_telegram_id(telegram_id)

    if profile_data:
        status = (
            "Premium"
            if profile_data.get("subscriptionStatus") == "PREMIUM"
            else "Бесплатный"
        )
        attempts = profile_data.get("remainingInterpretations", 0)

        name = escape_markdown_v2(profile_data.get("name", "Не указано"))

        text_lines = [
            f"👤 *Твой профиль*",
            f"**Имя:** {name}",
            f"**Статус:** `{status}`",
            f"**Осталось толкований:** `{attempts}`",
        ]

        if (
            status == "Бесплатный"
            and attempts == 0
            and profile_data.get("lastFreeInterpretationAt")
        ):
            text_lines.append(
                "\n_Следующее бесплатное толкование будет доступно через 3 дня после последнего использования\\._"
            )

        await message.answer(
            "\n".join(text_lines),
            parse_mode="MarkdownV2",
            reply_markup=get_profile_keyboard(),
        )
    else:
        await message.answer(
            "Не удалось загрузить данные профиля. Возможно, нужно снова связать аккаунт.",
            reply_markup=get_onboarding_keyboard(),
        )


@router.callback_query(F.data == "show_history")
async def history_button_handler(callback: CallbackQuery, bot: Bot):
    await bot.send_chat_action(chat_id=callback.message.chat.id, action=ChatAction.TYPING)
    telegram_id = callback.from_user.id
    history_data = await api_client.get_history(telegram_id, page=1)

    if history_data and history_data.get("data"):
        text = "Вот твоя история снов. Нажми на сон, чтобы посмотреть полную переписку."
        markup = create_history_keyboard(history_data)
        await callback.message.answer(text, reply_markup=markup)
    else:
        await callback.message.answer(
            "Твоя история снов пока пуста. Расскажи мне свой первый сон!"
        )
    await callback.answer()



@router.message(F.text == "▶️ Начать диалог", StateFilter(None))
async def start_dialog_handler(message: Message, state: FSMContext):
    await state.set_state(ChatStates.in_dialogue)
    await message.answer(
        "Я готов слушать. Опиши свой сон, и я помогу его разгадать.",
        reply_markup=get_dialog_menu(),
    )


@router.message(F.text == "⏹️ Завершить диалог", StateFilter(ChatStates.in_dialogue))
async def end_dialog_handler(message: Message, state: FSMContext):
    await state.clear()
    await message.answer(
        "Диалог завершен. Если захочешь обсудить другой сон, просто нажми 'Начать диалог'.",
        reply_markup=get_main_menu(),
    )


@router.message(StateFilter(ChatStates.in_dialogue))
async def dialogue_message_handler(message: Message, state: FSMContext):
    telegram_id = message.from_user.id
    await message.bot.send_chat_action(chat_id=message.chat.id, action=ChatAction.TYPING)

    data = await state.get_data()
    session_id = data.get("session_id")

    if not session_id:
        response = await api_client.send_dream(telegram_id, message.text)
        
        if response and response.get("sessionId"):
            await state.update_data(session_id=response["sessionId"])
            await message.answer(
                response.get("initialResponse", "Интересный сон... Дай мне подумать.")
            )
        else:
            error_text = "Прости, не смог начать толкование. Попробуй позже."
            if response and response.get("error"):
                error_text = response.get("error")

            await message.answer(error_text)
            await state.clear()
            await message.answer(
                "Диалог завершен.", reply_markup=get_main_menu()
            )
    else:
        response = await api_client.send_follow_up(
            session_id, telegram_id, message.text
        )
        if response and response.get("response"):
            await message.answer(response.get("response"))
        else:
            await message.answer("Прости, не смог обработать твой вопрос. Попробуй еще раз.")


@router.callback_query(F.data.startswith("history_page_"))
async def pagination_handler(callback: CallbackQuery, bot: Bot):
    page = int(callback.data.split("_")[-1])
    telegram_id = callback.from_user.id

    await bot.send_chat_action(chat_id=callback.message.chat.id, action=ChatAction.TYPING)
    history_data = await api_client.get_history(telegram_id, page=page)

    if history_data and history_data.get("data"):
        text = "Вот твоя история снов. Нажми на сон, чтобы посмотреть полную переписку."
        markup = create_history_keyboard(history_data)
        try:
            await callback.message.edit_text(text, reply_markup=markup)
        except TelegramBadRequest:
            await callback.answer("Изменений нет")
    else:
        await callback.message.edit_text("История снов пуста.")

    await callback.answer()


@router.callback_query(F.data.startswith("session_"))
async def session_view_handler(callback: CallbackQuery, bot: Bot):
    parts = callback.data.split("_")   
    session_id = parts[1]
    page = int(parts[3])

    await bot.send_chat_action(chat_id=callback.message.chat.id, action=ChatAction.TYPING)
    session_data = await api_client.get_session_details(session_id)

    if session_data and session_data.get("messages"):
        title = escape_markdown_v2(session_data.get("title", ""))
        chat_log_parts = [f"📜 *Сон: {title}*\n"]

        for msg in session_data["messages"]:
            role = "Вы" if msg["role"] == "user" else "Морфеус"
            content = escape_markdown_v2(msg["content"])
            chat_log_parts.append(f"*{role}:*\n{content}\n")

        full_text = "\n".join(chat_log_parts)
        
        await callback.message.edit_text(
            full_text,
            parse_mode="MarkdownV2",
            reply_markup=get_session_view_keyboard(session_id, page),
        )
    else:
        await callback.answer("Не удалось загрузить данные этого сна.", show_alert=True)

    await callback.answer()



@router.callback_query(F.data.startswith("confirm_delete_"))
async def confirm_delete_handler(callback: CallbackQuery):
    try:
        _, _, session_id, page_str = callback.data.split("_")
        page = int(page_str)
    except (ValueError, IndexError):
        await callback.answer("Ошибка в данных.", show_alert=True)
        return

    await callback.message.edit_text(
        "Вы уверены, что хотите удалить этот сон? Это действие необратимо.",
        reply_markup=get_confirm_delete_keyboard(session_id, page)
    )
    await callback.answer()

@router.callback_query(F.data.startswith("delete_"))
async def delete_session_handler(callback: CallbackQuery):
    try:
        _, session_id, _ = callback.data.split("_")
    except (ValueError, IndexError):
        await callback.answer("Ошибка в данных.", show_alert=True)
        return

    telegram_id = callback.from_user.id
    
    await callback.message.edit_text("Удаляю сон...")
    response_code = await api_client.delete_session(session_id, telegram_id)
    if response_code == 204:
         await callback.message.edit_text("✅ Сон успешно удален.")
    else:
         await callback.message.edit_text(f"❌ Ошибка: Не удалось удалить сон (код: {response_code}).")

    await callback.answer()