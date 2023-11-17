import { WechatyBuilder } from "wechaty";
import qrCodeTerminal from "qrcode-terminal";
import config from "./config.js";
import ChatGPT from "./chatgpt.js";
import {
  ContactSelfInterface,
  MessageInterface,
  WechatyInterface,
} from "wechaty/impls";

let bot: WechatyInterface | null = null;

let userInfo: ContactSelfInterface | null = null;

const startTime = new Date();

let chatGPTClient: any = null;

initProject();

async function onMessage(msg: MessageInterface) {
  // 避免重复发送
  if (msg.date() < startTime || !bot) {
    return;
  }
  // 消息发送方
  const contact = msg.talker();
  // 消息接收方
  const receiver = msg.listener();
  // 消息内容
  const content = msg.text().trim();
  // 消息所在的微信群
  const room = msg.room();
  // 发送方名称
  const alias = (await contact.alias()) || (await contact.name());
  // 消息类型
  const isText = msg.type() === bot.Message.Type.Text;

  // 自己发的消息不处理
  if (msg.self()) {
    return;
  }

  if (room && isText) {
    // 群名
    const topic = await room.topic();
    // 群里的发言人
    const name = await contact.name();

    console.log(`Group name: ${topic} talker: ${name} content: ${content}`);

    const pattern = RegExp(`^@${userInfo?.name()}\\s+${config.groupKey}[\\s]*`);

    const isMentioned = await msg.mentionSelf();

    if (isMentioned) {
      if (pattern.test(content)) {
        const groupContent = content.replace(pattern, "");
        console.log(`Group content: ${groupContent}`);
        chatGPTClient.replyMessage(room, groupContent);
        return;
      } else {
        console.log(
          "Content is not within the scope of the customization format"
        );
      }
    }
  } else if (isText) {
    console.log(`talker: ${alias} content: ${content}`);
    if (content.startsWith(config.privateKey) || config.privateKey === "") {
      let privateContent = content;
      if (config.privateKey === "") {
        privateContent = content.substring(config.privateKey.length).trim();
      }
      chatGPTClient.replyMessage(contact, privateContent);
    } else {
      console.log(
        "Content is not within the scope of the customization format"
      );
    }
  }
}

function onScan(qrCode: string) {
  qrCodeTerminal.generate(qrCode, { small: true }); // 在console端显示二维码
  const qrCodeImageUrl = [
    "https://api.qrserver.com/v1/create-qr-code/?data=",
    encodeURIComponent(qrCode),
  ].join("");

  console.log(qrCodeImageUrl);
}

async function onLogin(user: ContactSelfInterface) {
  userInfo = user;
  console.log(`${user.name()} has logged in`);
  const date = new Date();
  console.log(`Current time:${date}`);
}

function onLogout(user: ContactSelfInterface) {
  console.log(`${user.name()} has logged out`);
}

async function initProject() {
  try {
    chatGPTClient = new ChatGPT();

    bot = WechatyBuilder.build({
      name: "WechatEveryDay",
      puppet: "wechaty-puppet-wechat", // 如果有token，记得更换对应的puppet
      puppetOptions: {
        uos: true,
      },
    });

    bot
      .on("scan", onScan)
      .on("login", onLogin)
      .on("logout", onLogout)
      .on("message", onMessage);

    bot
      .start()
      .then(() => console.log("Start to log in wechat..."))
      .catch((e) => console.error(e));
  } catch (error) {
    console.log("init error: ", error);
  }
}
