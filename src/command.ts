import { HearManager } from "@vk-io/hear";
import { randomInt } from "crypto";
import { Keyboard, KeyboardBuilder } from "vk-io";
import { IQuestionMessageContext } from "vk-io-question";
import { answerTimeLimit, chat_id, root, timer_text, vk } from ".";
import prisma from "./module/prisma";
import { Accessed, Confirm_User_Success, Keyboard_Index, Logger, Match, Online_Set, Parser_IDVK, Researcher_Better_Blank, Researcher_Better_Blank_Target, Send_Message, User_Banned, User_Info } from "./module/helper";
import { abusivelist, Censored_Activation, Censored_Activation_Pro } from "./module/blacklist";
import { Account, Blank, Mail } from "@prisma/client";
import { Blank_Browser, Blank_Cleaner, Blank_Like, Blank_Report, Blank_Unlike } from "./module/blank_swap";
import { Keyboard_Swap } from "./module/keyboard";

export function commandUserRoutes(hearManager: HearManager<IQuestionMessageContext>): void {
	hearManager.hear(/!спутник|!Спутник/, async (context: any) => {
        if (context.peerType == 'chat') { return }
        const user_check = await prisma.account.findFirst({ where: { idvk: context.senderId } })
        if (!user_check) { return }
		await Online_Set(context)
		const user_inf = await User_Info(context)
		const blank_check = await prisma.blank.findFirst({ where: { id_account: user_check?.id } })
		const mail_check = await prisma.mail.findFirst({ where: {  blank_to: blank_check?.id ?? 0, read: false, find: true } })
		
        const keyboard = new KeyboardBuilder()
    	.textButton({ label: '📃 Моя анкета', payload: { command: 'card_enter' }, color: 'secondary' })
		.textButton({ label: `${mail_check ? '📬' : '📪'} Почта`, payload: { command: 'card_enter' }, color: 'secondary' }).row()
    	.textButton({ label: '🔍 Поиск', payload: { command: 'inventory_enter' }, color: 'primary' })
		.textButton({ label: '🎲 Рандом', payload: { command: 'shop_category_enter' }, color: 'positive' }).row()
		.textButton({ label: '⚙ Цензура', payload: { command: 'shop_category_enter' }, color: 'negative' })
    	.textButton({ label: '🌐 Браузер', payload: { command: 'shop_category_enter' }, color: 'negative' }).row()
		.textButton({ label: '📐 Пкметр', payload: { command: 'shop_category_enter' }, color: 'positive' })
    	if (await Accessed(context) != `user`) {
    	    keyboard.textButton({ label: '⚖ Модерация', payload: { command: 'admin_enter' }, color: 'secondary' }).row()
    	}
    	//keyboard.urlButton({ label: '⚡ Инструкция', url: `https://vk.com/@bank_mm-instrukciya-po-polzovaniu-botom-centrobanka-magomira` }).row()
    	keyboard.textButton({ label: '🚫', payload: { command: 'exit' }, color: 'secondary' }).oneTime().inline()
		await Send_Message(user_check.idvk, `🛰 Вы в системе поиска соролевиков, ${user_inf.first_name}, что изволите?`, keyboard)
        await Logger(`(private chat) ~ enter in main menu system is viewed by <user> №${context.senderId}`)
    })
	//почта
	hearManager.hear(/📬 Почта|📪 Почта|!почта/, async (context: any) => {
		if (context.peerType == 'chat') { return }
        const user_check = await prisma.account.findFirst({ where: { idvk: context.senderId } })
		const blank_check = await prisma.blank.findFirst({ where: { id_account: user_check?.id } })
        if (!user_check || !blank_check) { return }
		if (blank_check.banned) {
			await context.send(`Ваша анкета заблокирована из-за жалоб до разбирательств`)
			return
		}
		const banned_me = await User_Banned(context)
		if (banned_me) { return }
		await Online_Set(context)
		const mail_build = []
		for (const mail of await prisma.mail.findMany({ where: { blank_to: blank_check.id, read: false, find: true } })) {
			mail_build.push(mail)
		}
		let ender = true
		await Logger(`(private chat) ~ starting check self mail by <user> №${context.senderId}`)
		while (ender && mail_build.length > 0) {
			const target = Math.floor(Math.random() * mail_build.length)
			const selector: Mail = mail_build[target]
			const blank_to_check = await prisma.blank.findFirst({ where: { id: selector.blank_to } })
			const blank_from_check = await prisma.blank.findFirst({ where: { id: selector.blank_from } })
			if (!blank_to_check || !blank_from_check) { 
				const mail_skip = await prisma.mail.update({ where: { id: selector.id }, data: { read: true, find: false } })
				mail_build.splice(target, 1)
				await Send_Message(user_check.idvk, `⚠ Недавно ваша анкета #${blank_to_check?.id} понравилась ролевику с анкетой #${blank_from_check?.id}, но ваша или опоннента анкета не были найдены, сообщение было помечено не найденным\n `)
				continue
			}
			const account_to = await prisma.account.findFirst({ where: { id: blank_to_check.id_account } })
			const account_from = await prisma.account.findFirst({ where: { id: blank_from_check.id_account } })
			if (!account_to || !account_from) {
				const mail_skip = await prisma.mail.update({ where: { id: selector.id }, data: { read: true, find: false } })
				mail_build.splice(target, 1)
				await Send_Message(user_check.idvk, `⚠ Недавно ваша анкета #${blank_to_check?.id} понравилась ролевику с анкетой #${blank_from_check?.id}, но ваc или опоннента больше нет в системе, сообщение было помечено не найденным\n `)
				continue
			}
			let censored = user_check.censored ? await Censored_Activation_Pro(blank_from_check.text) : blank_from_check.text
			const corrected: any = await context.question(`🔔 Ваша анкета #${blank_to_check.id} понравилась автору следующей анкеты:\n 📜 Анкета: ${blank_from_check.id}\n💬 Содержание: ${censored}`,
				{	
					keyboard: Keyboard.builder()
					.textButton({ label: '👎', payload: { command: 'student' }, color: 'secondary' })
					.textButton({ label: '👍', payload: { command: 'citizen' }, color: 'secondary' }).row()
					.textButton({ label: '🚫Назад', payload: { command: 'citizen' }, color: 'secondary' })
					.oneTime().inline(),
					answerTimeLimit
				}
			)
			if (corrected.isTimeout) { return await context.send(`⏰ Время ожидания разбора почты истекло!`) }
			if (corrected.text == '🚫Назад' || corrected.text == '!назад') {
				await Send_Message(user_check.idvk, `✅ Успешная отмена просмотра почтового ящика анкет.`)
				ender = false
			}
			if (corrected.text == '👎' || corrected.text == '!дизлайк') {
				const mail_skip = await prisma.mail.update({ where: { id: selector.id }, data: { read: true } })
				mail_build.splice(target, 1)
				await Send_Message(user_check.idvk, `✅ Игнорируем анкету #${selector.blank_from} полностью.`)
				await Logger(`(private chat) ~ clicked unlike for <blank> #${blank_to_check.id} by <user> №${context.senderId}`)
			}
			if (corrected.text == '👍' || corrected.text == '!лайк') {
				const mail_skip = await prisma.mail.update({ where: { id: selector.id }, data: { read: true, status: true } })
				mail_build.splice(target, 1)
				await Send_Message(account_to.idvk, `🔊 Недавно вам понравилась анкета #${blank_from_check.id}, знайте это взаимно на вашу анкету #${blank_to_check.id}.\n Скорее пишите друг другу в личные сообщения и ловите флешбеки вместе, станьте врагами уже сегодня с https://vk.com/id${account_from.idvk} !`)
				await Send_Message(account_from.idvk, `🔊 Недавно вам понравилась анкета #${blank_to_check.id}, знайте это взаимно на вашу анкету #${blank_from_check.id}.\n Скорее пишите друг другу в личные сообщения и ловите флешбеки вместе, станьте врагами уже сегодня с https://vk.com/id${account_to.idvk} !`)
        		await Logger(`(private chat) ~ clicked like for <blank> #${blank_to_check.id} by <user> №${context.senderId}`)
				const ans_selector = `🌐 Анкеты №${blank_from_check.id} + №${blank_to_check.id} = [ролевики навсегда]!`
    			await Send_Message(chat_id, ans_selector)
			}
		}
		if (mail_build.length == 0) { await Send_Message(user_check.idvk, `😿 Письма кончились, приходите позже.`)}
        await Logger(`(private chat) ~ finished check self mail by <user> №${context.senderId}`)
		await Keyboard_Index(context, `⌛ Кибер совиная почта на связи, выдаем кнопку вызова спутника...`)
    })
	//для рандома
	hearManager.hear(/🎲 Рандом|!рандом/, async (context: any) => {
        if (context.peerType == 'chat') { return }
        const user_check = await prisma.account.findFirst({ where: { idvk: context.senderId } })
		const blank_check = await prisma.blank.findFirst({ where: { id_account: user_check?.id } })
        if (!user_check) { return }
		if (!blank_check) { return await context.send(`Создайте анкету`) }
		if (blank_check.banned) {
			await context.send(`Ваша анкета заблокирована из-за жалоб до разбирательств`)
			return
		}
		const banned_me = await User_Banned(context)
		if (banned_me) { return }
		await Online_Set(context)
		let blank_build = []
		let counter = 0
		for (const blank of await prisma.$queryRaw<Blank[]>`SELECT * FROM Blank WHERE banned = false ORDER BY random() ASC`) {
			if (blank.id_account == user_check.id) { continue }
			const vision_check = await prisma.vision.findFirst({ where: { id_blank: blank.id, id_account: user_check.id } })
			if (vision_check) { continue }
			if (counter > 50) { break }
			blank_build.push(blank)
			counter++
		}
		let ender = true
		await Logger(`(private chat) ~ starting check random blank by <user> №${context.senderId}`)
		while (ender && blank_build.length > 0) {
			const target = Math.floor(Math.random() * blank_build.length)
			const selector: Blank = blank_build[target]
			const blank_check = await prisma.blank.findFirst({ where: { id: selector.id } })
			if (!blank_check) { 
				blank_build.splice(target, 1)
				await Send_Message(user_check.idvk, `⚠ Внимание, следующая анкета была удалена владельцем в процессе просмотра и изьята из поиска:\n\n📜 Анкета: ${selector.id}\n💬 Содержание: ${selector.text}\n `)
				continue
			}
			let censored = user_check.censored ? await Censored_Activation_Pro(selector.text) : selector.text
			const corrected: any = await context.question(`📜 Анкета: ${selector.id}\n💬 Содержание: ${censored}`, {	keyboard: await Keyboard_Swap(blank_build.length), answerTimeLimit })
			if (corrected.isTimeout) { return await context.send(`⏰ Время ожидания случайного поиска анкеты истекло!`) }
			const config: any = {
				'⛔ Налево': Blank_Unlike,
				'✅ Направо': Blank_Like,
				'⚠ Жалоба': Blank_Report,
			}
			if (corrected.text in config) {
				const commandHandler = config[corrected.text];
				const ans = await commandHandler(context, user_check, selector, blank_build, target)
			} else {
				if (corrected.text == '🚫 Назад' || corrected.text == '!назад') {
					await Send_Message(user_check.idvk, `✅ Успешная отмена рандомных анкет.`)
					ender = false
				} else { await Send_Message(user_check.idvk, `💡 Жмите только по кнопкам с иконками!`) }
			}
		}
		if (blank_build.length == 0) { await Send_Message(user_check.idvk, `😿 Очередь анкет закончилась, попробуйте вызвать !рандом еще раз, иначе приходите позже.`)}
        await Logger(`(private chat) ~ finished check random blank by <user> №${context.senderId}`)
		await Keyboard_Index(context, `⌛ В рот этого казино! Выдаем кнопку вызова спутника...`)
    })
	//для поиска
	hearManager.hear(/🔍 Поиск|!поиск/, async (context: any) => {
        if (context.peerType == 'chat') { return }
        const user_check = await prisma.account.findFirst({ where: { idvk: context.senderId } })
		const blank_check = await prisma.blank.findFirst({ where: { id_account: user_check?.id } })
        if (!user_check) { return }
		if (!blank_check) { return await context.send(`Создайте анкету`) }
		if (blank_check.banned) {
			await context.send(`Ваша анкета заблокирована из-за жалоб до разбирательств`)
			return
		}
		const banned_me = await User_Banned(context)
		if (banned_me) { return }
		await Online_Set(context)
		let blank_build = []
		await context.send(`⌛ Ожидайте, подбираем анкеты...`)
		for (const blank of await prisma.$queryRaw<Blank[]>`SELECT * FROM Blank WHERE banned = false ORDER BY random() ASC`) {
			if (blank.id_account == user_check.id) { continue }
			const vision_check = await prisma.vision.findFirst({ where: { id_blank: blank.id, id_account: user_check.id } })
			if (vision_check) { continue }
			blank_build.push(await Researcher_Better_Blank_Target(blank_check.text, blank))
			blank_build.sort((a, b) => b.score - a.score)
			blank_build.length = Math.min(blank_build.length, 50); 
		}
		let ender = true
		await Logger(`(private chat) ~ starting check random blank by <user> №${context.senderId}`)
		while (ender && blank_build.length > 0) {
			const selector: Match = blank_build[0]
			const blank_check = await prisma.blank.findFirst({ where: { id: selector.id } })
			if (!blank_check) { 
				blank_build.splice(0, 1)
				await Send_Message(user_check.idvk, `⚠ Внимание, следующая анкета была удалена владельцем в процессе просмотра и изьята из поиска:\n\n📜 Анкета: ${selector.id}\n💬 Содержание: ${selector.text}\n `)
				continue
			}
			let censored = user_check.censored ? await Censored_Activation_Pro(selector.text) : selector.text
			const corrected: any = await context.question(`📜 Анкета: ${selector.id}\n🔎 Совпадение: ${(selector.score*100).toFixed(2)}%\n💬 Содержание: ${censored}\n`, {	keyboard: await Keyboard_Swap(blank_build.length), answerTimeLimit })
			if (corrected.isTimeout) { return await context.send(`⏰ Время ожидания поиска анкеты истекло!`) }
			const config: any = {
				'⛔ Налево': Blank_Unlike,
				'✅ Направо': Blank_Like,
				'⚠ Жалоба': Blank_Report,
			}
			if (corrected.text in config) {
				const commandHandler = config[corrected.text];
				const ans = await commandHandler(context, user_check, selector, blank_build, 0)
			} else {
				if (corrected.text == '🚫 Назад' || corrected.text == '!назад') {
					await Send_Message(user_check.idvk, `✅ Успешная отмена поиска анкет.`)
					ender = false
				} else { await Send_Message(user_check.idvk, `💡 Жмите только по кнопкам с иконками!`) }
			}
		}
		if (blank_build.length == 0) { await Send_Message(user_check.idvk, `😿 Очередь анкет закончилась, попробуйте вызвать !рандом еще раз, иначе приходите позже.`)}
        await Logger(`(private chat) ~ finished check random blank by <user> №${context.senderId}`)
		await Keyboard_Index(context, `⌛ А давайте закроем глаза и представим того самого человека... Выдаем кнопку вызова спутника...`)
    })
	//для браузера
	hearManager.hear(/🌐 Браузер|!браузер/, async (context: any) => {
        if (context.peerType == 'chat') { return }
        const user_check = await prisma.account.findFirst({ where: { idvk: context.senderId } })
		const blank_check = await prisma.blank.findFirst({ where: { id_account: user_check?.id } })
        if (!user_check) { return }
		if (!blank_check) { return await context.send(`Создайте анкету`) }
		if (blank_check.banned) {
			await context.send(`Ваша анкета заблокирована из-за жалоб до разбирательств`)
			return
		}
		const banned_me = await User_Banned(context)
		if (banned_me) { return }
		await Online_Set(context)
		const ans = await Blank_Browser(context, user_check)
		if (!ans.status) { return await context.send(`Вы отменили поиск в браузере`) }
		let blank_build = []
		await context.send(`⌛ Ожидайте, подбираем анкеты...`)
		for (const blank of await prisma.$queryRaw<Blank[]>`SELECT * FROM Blank WHERE banned = false ORDER BY random() ASC`) {
			if (blank.id_account == user_check.id) { continue }
			const vision_check = await prisma.vision.findFirst({ where: { id_blank: blank.id, id_account: user_check.id } })
			if (vision_check) { continue }
			blank_build.push(await Researcher_Better_Blank_Target(ans.text, blank))
			blank_build.sort((a, b) => b.score - a.score)
			blank_build.length = Math.min(blank_build.length, 50); 
		}
		
		let ender = true
		await Logger(`(private chat) ~ starting check browser blank by <user> №${context.senderId}`)
		while (ender && blank_build.length > 0) {
			const selector: Match = blank_build[0]
			const blank_check = await prisma.blank.findFirst({ where: { id: selector.id } })
			if (!blank_check) { 
				blank_build.splice(0, 1)
				await Send_Message(user_check.idvk, `⚠ Внимание, следующая анкета была удалена владельцем в процессе просмотра и изьята из поиска:\n\n📜 Анкета: ${selector.id}\n💬 Содержание: ${selector.text}\n `)
				continue
			}
			let censored = user_check.censored ? await Censored_Activation_Pro(selector.text) : selector.text
			const corrected: any = await context.question(`📜 Анкета: ${selector.id}\n🔎 Совпадение: ${(selector.score*100).toFixed(2)}%\n💬 Содержание: ${censored}\n`, {	keyboard: await Keyboard_Swap(blank_build.length), answerTimeLimit })
			if (corrected.isTimeout) { return await context.send(`⏰ Время ожидания поиска анкеты истекло!`) }
			const config: any = {
				'⛔ Налево': Blank_Unlike,
				'✅ Направо': Blank_Like,
				'⚠ Жалоба': Blank_Report,
			}
			if (corrected.text in config) {
				const commandHandler = config[corrected.text];
				const ans = await commandHandler(context, user_check, selector, blank_build, 0)
			} else {
				if (corrected.text == '🚫 Назад' || corrected.text == '!назад') {
					await Send_Message(user_check.idvk, `✅ Успешная отмена поиска анкет через  браузер.`)
					ender = false
				} else { await Send_Message(user_check.idvk, `💡 Жмите только по кнопкам с иконками!`) }
			}
		}
		if (blank_build.length == 0) { await Send_Message(user_check.idvk, `😿 Очередь анкет закончилась, попробуйте вызвать !браузер еще раз, иначе приходите позже.`)}
        await Logger(`(private chat) ~ finished check browser blank by <user> №${context.senderId}`)
		await Keyboard_Index(context, `⌛ Хватит искать и серфить? Нет не хватит, выдаем кнопку вызова спутника...`)
    })
	// для анкеты
	hearManager.hear(/📃 Моя анкета|!анкета/, async (context: any) => {
        if (context.peerType == 'chat') { return }
        const user_check = await prisma.account.findFirst({ where: { idvk: context.senderId } })
        if (!user_check) { return }
		const banned_me = await User_Banned(context)
		if (banned_me) { return }
		await Online_Set(context)
		const blank_check = await prisma.blank.findFirst({ where: { id_account: user_check.id } })
		if (!blank_check) {
			let ender = true
			let text_input = ``
			let status_check = ``
			await Logger(`(private chat) ~ starting creation self blank by <user> №${context.senderId}`)
			while (ender) {
				let censored = user_check.censored ? await Censored_Activation_Pro(text_input) : text_input
				const corrected: any = await context.question(`🧷 У вас еще нет анкеты, введите анкету от 30 до 4000 символов, английские символы запрещены: \n 💡Вы можете указать: пол, возраст, минимальный порог строк, желаемые жанры или же сюжет... другие нюансы.\n📝 Сейчас заполнено: ${censored}\n\n${status_check}`,
					{	
						keyboard: Keyboard.builder()
						.textButton({ label: '!сохранить', payload: { command: 'student' }, color: 'secondary' })
						.textButton({ label: '!отмена', payload: { command: 'citizen' }, color: 'secondary' })
						.oneTime().inline(),
						answerTimeLimit
					}
				)
				if (corrected.isTimeout) { return await context.send(`⏰ Время ожидания создания анкеты истекло!`) }
				if (corrected.text == '!сохранить') {
					if (text_input.length < 30) { await context.send(`Анкету от 30 символов надо!`); continue }
					const save = await prisma.blank.create({ data: { text: text_input, id_account: user_check.id } })
					await context.send(`Вы успешно создали анкетку-конфетку под UID: ${save.id}`)
					ender = false
				} else {
					if (corrected.text == '!отмена') {
						await context.send(`Вы отменили создание анкеты`)
						ender = false
					} else {
						text_input = await Blank_Cleaner(corrected.text)
						status_check = `⚠ В анкете зарегистрировано ${text_input?.length} из ${corrected.text?.length} введенных вами символов, убедитесь в корректном отображении анкеты!`
					}
				}
			}
		} else {
			const blank = await prisma.blank.findFirst({ where: { id_account: user_check.id } })
			await Logger(`(private chat) ~ starting self blank is viewed by <user> №${context.senderId}`)
			if (blank) {
				const keyboard = new KeyboardBuilder()
    			.textButton({ label: `⛔Удалить ${blank.id}`, payload: { command: 'card_enter' }, color: 'secondary' }).row()
    			.textButton({ label: `✏Изменить ${blank.id}`, payload: { command: 'inventory_enter' }, color: 'secondary' }).row()
    			keyboard.textButton({ label: '🚫', payload: { command: 'exit' }, color: 'secondary' }).oneTime().inline()
				const count_vision = await prisma.vision.count({ where: { id_blank: blank.id } })
				const count_max_vision = await prisma.blank.count({})
				const count_success = await prisma.mail.count({ where: { blank_to: blank.id, read: true, status: true }})
				const count_ignore = await prisma.mail.count({ where: { blank_to: blank.id, read: true, status: false }})
				const count_wrong = await prisma.mail.count({ where: { blank_to: blank.id, read: true, find: false }})
				const count_unread = await prisma.mail.count({ where: { blank_to: blank.id, read: false }})
				const counter_warn = await prisma.report.count({ where: { id_blank: blank.id } })
				let censored = user_check.censored ? await Censored_Activation_Pro(blank.text) : blank.text
				await Send_Message(user_check.idvk, `📜 Анкета: ${blank.id}\n💬 Содержание: ${censored}\n👁 Просмотров: ${count_vision}/${-1+count_max_vision}\n⚠ Предупреждений: ${counter_warn}/3\n✅ Принятых: ${count_success}\n🚫 Игноров: ${count_ignore}\n⌛ Ожидает: ${count_unread}\n❗ Потеряшек: ${count_wrong}`, keyboard)
			}
		}
        await Logger(`(private chat) ~ finished self blank is viewed by <user> №${context.senderId}`)
    })
	hearManager.hear(/⛔Удалить|!удалить/, async (context: any) => {
        if (context.peerType == 'chat') { return }
        const user_check = await prisma.account.findFirst({ where: { idvk: context.senderId } })
        if (!user_check) { return }
		const banned_me = await User_Banned(context)
		if (banned_me) { return }
		await Online_Set(context)
		const [cmd, value] = context.text.split(' ');
        const target = parseInt(value)
		const blank_check = await prisma.blank.findFirst({ where: { id_account: user_check.id, id: target } })
		if (!blank_check) { return }
		if (blank_check.banned) {
			await context.send(`Ваша анкета заблокирована из-за жалоб до разбирательств`)
			return
		}
		const confirm: { status: boolean, text: String } = await Confirm_User_Success(context, `удалить свою анкету №${blank_check.id}?`)
    	await context.send(`${confirm.text}`)
    	if (!confirm.status) { return; }
		const blank_delete = await prisma.blank.delete({ where: { id: blank_check.id } })
        if (blank_delete) { 
			await Send_Message(user_check.idvk, `✅ Успешно удалено:\n📜 Анкета: ${blank_delete.id}\n💬 Содержание: ${blank_delete.text}`)
			await Logger(`(private chat) ~ deleted self <blank> #${blank_delete.id} by <user> №${context.senderId}`)
		}
		await Keyboard_Index(context, `⌛ Удаление, мать учения, выдаем кнопку вызова спутника...`)
    })
	hearManager.hear(/✏Изменить|!изменить/, async (context: any) => {
        if (context.peerType == 'chat') { return }
        const user_check = await prisma.account.findFirst({ where: { idvk: context.senderId } })
        if (!user_check) { return }
		const banned_me = await User_Banned(context)
		if (banned_me) { return }
		await Online_Set(context)
		const [cmd, value] = context.text.split(' ');
        const target = parseInt(value)
		const blank_check = await prisma.blank.findFirst({ where: { id_account: user_check.id, id: target } })
		if (!blank_check) { return }
		if (blank_check.banned) {
			await context.send(`Ваша анкета заблокирована из-за жалоб до разбирательств`)
			return
		}
		const datenow: any = new Date()
        const dateold: any = new Date(blank_check.crdate)
		const timeouter = 86400000
        if (datenow-dateold > timeouter) { return await context.send(`Анкете больше суток, редактирование запрещено`) }
		const confirm: { status: boolean, text: String } = await Confirm_User_Success(context, `изменить свою анкету №${blank_check.id}?`)
    	await context.send(`${confirm.text}`)
    	if (!confirm.status) { return; }
		let ender = true
		let text_input = blank_check.text
		let status_check = ``
		while (ender) {
			let censored = user_check.censored ? await Censored_Activation_Pro(text_input) : text_input
			const corrected: any = await context.question(`🧷 Вы редактируете анкету ${blank_check.id}, напоминаем анкета должна быть до 4000 символов:\n📝 текущая анкета: ${censored}\n ${status_check}`,
				{	
					keyboard: Keyboard.builder()
					.textButton({ label: '!сохранить', payload: { command: 'student' }, color: 'secondary' })
					.textButton({ label: '!отмена', payload: { command: 'citizen' }, color: 'secondary' })
					.oneTime().inline(),
					answerTimeLimit
				}
			)
			if (corrected.isTimeout) { return await context.send(`⏰ Время ожидания редактирования анкеты истекло!`) }
			if (corrected.text == '!сохранить') {
				if (text_input.length < 30) { await context.send(`Анкету от 30 символов надо!`); continue }
				const blank_edit = await prisma.blank.update({ where: { id: blank_check.id }, data: { text: text_input } })
				await Send_Message(user_check.idvk, `✅ Успешно изменено:\n📜 Анкета: ${blank_edit.id}\n💬 Содержание: ${blank_edit.text}`)
				ender = false
			} else {
				if (corrected.text == '!отмена') {
					await context.send(`Вы отменили редактирование анкеты`)
					ender = false
				} else {
					text_input = await Blank_Cleaner(corrected.text)
					status_check = `⚠ В анкете зарегистрировано ${text_input?.length} из ${corrected.text?.length} введенных вами символов, убедитесь в корректном отображении анкеты!`
				}
			}
		}
        await Logger(`(private chat) ~ finished edit self <blank> #${blank_check.id} by <user> №${context.senderId}`)
		await Keyboard_Index(context, `⌛ Изменение, отец учения, выдаем кнопку вызова спутника...`)
    })
	hearManager.hear(/⚙ Цензура|!цензура/, async (context: any) => {
        if (context.peerType == 'chat') { return }
        const user_check = await prisma.account.findFirst({ where: { idvk: context.senderId } })
        if (!user_check) { return }
		const banned_me = await User_Banned(context)
		if (banned_me) { return }
		await Online_Set(context)
        const censored_change = await prisma.account.update({ where: { id: user_check.id }, data: { censored: user_check.censored ? false : true } })
        if (censored_change) { 
			await Send_Message(user_check.idvk, `🔧 Цензура ${censored_change.censored ? 'активирована' : 'отключена'}`)
			await Logger(`(private chat) ~ changed status activity censored self by <user> №${context.senderId}`)
		}
		await Keyboard_Index(context, `⌛ Ух ты, сейчас как все запикается! Выдаем кнопку вызова спутника...`)
    })
	hearManager.hear(/!права/, async (context) => {
        if (context.isOutbox == false && (context.senderId == root || await Accessed(context) != 'user') && context.text) {
            const target: number = Number(context.text.replace(/[^0-9]/g,"")) || 0
            if (target > 0) {
                const user: Account | null = await prisma.account.findFirst({ where: { idvk: target } })
                if (user) {
					await Online_Set(context)
                    const login = await prisma.account.update({ where: { id: user.id }, data: { id_role: user.id_role == 1 ? 2 : 1 } })
                    await context.send(`@id${login.idvk}(Пользователь) ${login.id_role == 2 ? 'добавлен в лист администраторов' : 'убран из листа администраторов'}`)
					await Send_Message(login.idvk, `🔧 Вы ${login.id_role == 2 ? 'добавлены в лист администраторов' : 'убраны из листа администраторов'}`)
					await Send_Message(chat_id, `@id${login.idvk}(Пользователь) ${login.id_role == 2 ? 'добавлен в лист администраторов' : 'убран из листа администраторов'}`)
					await Logger(`(private chat) ~ changed role <${login.id_role == 2 ? 'admin' : 'user'}> for #${login.idvk} by <admin> №${context.senderId}`)
                } else {
                    await context.send(`@id${target}(Пользователя) не существует`)
					await Logger(`(private chat) ~ not found <user> #${target} by <admin> №${context.senderId}`)
                }
            }
        }
    })
	hearManager.hear(/⚖ Модерация|!модерация/, async (context: any) => {
		if (context.peerType == 'chat') { return }
        const user_check = await prisma.account.findFirst({ where: { idvk: context.senderId } })
		if (!user_check) { return }
		await Online_Set(context)
		const blank_check = await prisma.blank.findFirst({ where: { id_account: user_check?.id } })
        if (await Accessed(context) == 'user') { return }
		const blank_build = []
		for (const blank of await prisma.blank.findMany({ where: { banned: true } })) {
			blank_build.push(blank)
		}
		let ender = true
		await Logger(`(private chat) ~ starting check banned blanks by <admin> №${context.senderId}`)
		while (ender && blank_build.length > 0) {
			const target = Math.floor(Math.random() * blank_build.length)
			const selector: Blank = blank_build[target]
			for (const report of await prisma.report.findMany({ where: { id_blank: selector.id, status: 'wait' } })) {
				const user = await prisma.account.findFirst({ where: { id: report.id_account } })
				await context.send(`🗿 Жалоба от @id${user?.idvk}(КрысаХ):\n💬 Заявление: ${report.text}\n\n`)
			}
			const user_warned = await prisma.account.findFirst({ where: { id: selector.id_account } })
			const corrected: any = await context.question(`⚖ Вершится суд над следующей анкетой и ее автором:\n📜 Анкета: ${selector.id}\n👤 Автор: https://vk.com/id${user_warned?.idvk}\n💬 Содержание: ${selector.text}`,
				{	
					keyboard: Keyboard.builder()
					.textButton({ label: '⛔Отклонить', payload: { command: 'student' }, color: 'secondary' })
					.textButton({ label: '✅Заверить', payload: { command: 'citizen' }, color: 'secondary' }).row()
					.textButton({ label: '🚫Назад', payload: { command: 'citizen' }, color: 'secondary' })
					.oneTime().inline(),
					answerTimeLimit
				}
			)
			if (corrected.isTimeout) { return await context.send(`⏰ Время ожидания судебной системы истекло!`) }
			if (corrected.text == '🚫Назад' || corrected.text == '!назад') {
				await Send_Message(user_check.idvk, `✅ Успешная отмена просмотра заблокированных анкет.`)
				ender = false
			}
			if (corrected.text == '⛔Отклонить' || corrected.text == '!отклонить') {
				for (const report of await prisma.report.findMany({ where: { id_blank: selector.id, status: 'wait' } })) {
					await prisma.report.update({ where: { id: report.id }, data: { status: 'denied'}})
					const user = await prisma.account.findFirst({ where: { id: report.id_account } })
					await Send_Message(user!.idvk, `⛔ Ваша жалоба на анкету ${selector.id} отклонена.`)
				}
				const warn_skip = await prisma.blank.update({ where: { id: selector.id }, data: { banned: false } })
				blank_build.splice(target, 1)
				await Send_Message(user_warned!.idvk, `✅ Ваша анкета #${selector.id} была оправдана, доступ разблокирован.`)
				await Logger(`(private chat) ~ unlock for <blank> #${selector.id} by <admin> №${context.senderId}`)
				await Send_Message(user_check.idvk, `✅ Оправдали владельца анкеты #${selector.id}`)
			}
			if (corrected.text == '✅Заверить' || corrected.text == '!заверить') {
				for (const report of await prisma.report.findMany({ where: { id_blank: selector.id, status: 'wait' } })) {
					await prisma.report.update({ where: { id: report.id }, data: { status: 'success'}})
					const user = await prisma.account.findFirst({ where: { id: report.id_account } })
					await Send_Message(user!.idvk, `✅ Ваша жалоба на анкету ${selector.id} принята, спасибо за службу.`)
				}
				const warn_skip = await prisma.blank.delete({ where: { id: selector.id } })
				blank_build.splice(target, 1)
				await Send_Message(user_warned!.idvk, `⛔ Ваша анкета #${selector.id} нарушает правила, она удалена, в следующий раз будьте бдительней, поставили вас на учет.`)
				await Logger(`(private chat) ~ warn success for <blank> #${selector.id} by <admin> №${context.senderId}`)
				await Send_Message(user_check.idvk, `✅ Выдали пред владельцу анкеты #${selector.id}`)
			}
		}
		if (blank_build.length == 0) { await Send_Message(user_check.idvk, `😿 Забаненные анкеты кончились, приходите позже.`)}
        await Logger(`(private chat) ~ finished check banned blanks by <admin> №${context.senderId}`)
		await Keyboard_Index(context, `⌛ Система правосудия, это отстойно... Выдаем кнопку вызова спутника...`)
    })
	hearManager.hear(/енотик/, async (context: any) => {
        if (context.senderId != root) { return }
		await Online_Set(context)
        await context.sendDocuments({ value: `./prisma/dev.db`, filename: `dev.db` }, { message: '💡 Открывать на сайте: https://sqliteonline.com/' } );
        await vk.api.messages.send({
            peer_id: chat_id,
            random_id: 0,
            message: `‼ @id${context.senderId}(Admin) делает бекап баз данных dev.db.`
        })
        await Logger(`In private chat, did backup database by admin ${context.senderId}`)
    })
	hearManager.hear(/!бан/, async (context) => {
        if (context.isOutbox == false && (context.senderId == root || await Accessed(context) != 'user') && context.text) {
			const target = await Parser_IDVK(context.text)
			if (!target) { return }
            const user: Account | null = await prisma.account.findFirst({ where: { idvk: Number(target) } })
            if (user) {
				await Online_Set(context)
                const login = await prisma.account.update({ where: { id: user.id }, data: { banned: user.banned ? false : true } })
                await context.send(`@id${login.idvk}(Пользователь) ${login.banned ? 'добавлен в лист забаненных' : 'убран из листа забаненных'}`)
				await Send_Message(login.idvk, `🔧 Вы ${login.banned ? 'добавлены в лист забаненных' : 'убраны из листа забаненных'}`)
				await Send_Message(chat_id, `@id${login.idvk}(Пользователь) ${login.banned ? 'добавлен в лист забаненных' : 'убран из листа забаненных'}`)
				await Logger(`(private chat) ~ banned status changed <${login.banned ? 'true' : 'false'}> for #${login.idvk} by <admin> №${context.senderId}`)
            } else {
                await context.send(`@id${target}(Пользователя) не существует`)
				await Logger(`(private chat) ~ not found <user> #${target} for ban by <admin> №${context.senderId}`)
            }
            
        }
    })
}