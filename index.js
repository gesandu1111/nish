// ==========================================
// M.R. GESA PROFESSIONAL BOT SYSTEM
// ==========================================

const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    getContentType,
    fetchLatestBaileysVersion,
    Browsers,
} = require("@whiskeysockets/baileys");

const fs = require("fs");
const path = require("path");
const P = require("pino");
const express = require("express");
const { File } = require("megajs");
const app = express();
const port = process.env.PORT || 8000;

// Configuration ලෝඩ් කිරීම
const config = require("./config");
const { sms } = require("./lib/msg");
const { getBuffer, getGroupAdmins, sleep } = require("./lib/functions");

const AUTH_PATH = path.join(__dirname, "auth_info_baileys");

// ================= SESSION AUTO-RECOVERY =================
async function validateSession() {
    if (!fs.existsSync(AUTH_PATH)) {
        fs.mkdirSync(AUTH_PATH, { recursive: true });
    }

    if (!fs.existsSync(path.join(AUTH_PATH, "creds.json"))) {
        if (!config.SESSION_ID) {
            console.error("❌ ERROR: SESSION_ID is missing in config!");
            process.exit(1);
        }

        console.log("📥 Downloading session...");
        try {
            const filer = File.fromURL(`https://mega.nz/file/${config.SESSION_ID}`);
            const data = await new Promise((resolve, reject) => {
                filer.download((err, data) => (err ? reject(err) : resolve(data)));
            });
            fs.writeFileSync(path.join(AUTH_PATH, "creds.json"), data);
            console.log("✅ Session downloaded successfully.");
        } catch (err) {
            console.error("❌ Failed to download session:", err.message);
        }
    }
}

// ================= MAIN CONNECT FUNCTION =================
async function connectToWA() {
    await validateSession();

    // Database Connection
    const connectDB = require("./lib/mongodb");
    connectDB();

    const { readEnv } = require("./lib/database");
    const envConfig = await readEnv();
    const prefix = envConfig.PREFIX || ".";

    console.log("🚀 Starting M.R.Gesa Professional Engine...");

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_PATH);
    const { version } = await fetchLatestBaileysVersion();

    const bot = makeWASocket({
        logger: P({ level: "silent" }),
        printQRInTerminal: true, // QR එක අවශ්‍ය නම් Terminal එකේ පෙන්වයි
        browser: Browsers.macOS("Desktop"),
        syncFullHistory: false, // Memory ඉතිරි කිරීමට false කරන ලදී
        auth: state,
        version,
    });

    // ================= CONNECTION UPDATES =================
    bot.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (connection === "close") {
            const reason = lastDisconnect?.error?.output?.statusCode;
            console.log(`⚠️ Connection closed. Reason: ${reason}`);

            // Bad MAC හෝ Session දෝෂයක් ආවොත් ස්වයංක්‍රීයව පරණ දත්ත මකයි
            if (reason === DisconnectReason.loggedOut || (lastDisconnect?.error?.message?.includes("Bad MAC"))) {
                console.log("🛑 Critical Session Error! Cleaning up session files...");
                fs.rmSync(AUTH_PATH, { recursive: true, force: true });
                process.exit(1); // බොට් එක නවත්වයි (Auto-restart එකකින් නැවත හරිගස්සා ගනී)
            } else {
                connectToWA();
            }
        } else if (connection === "open") {
            console.log("📦 Installing professional plugins...");

            const pluginsPath = path.join(__dirname, "plugins");
            if (fs.existsSync(pluginsPath)) {
                fs.readdirSync(pluginsPath).forEach((file) => {
                    if (file.endsWith(".js")) {
                        try {
                            require(path.join(pluginsPath, file));
                            console.log(`✔️ [LOADED] ${file}`);
                        } catch (e) {
                            console.error(`❌ [ERROR] ${file}:`, e.message);
                        }
                    }
                });
            }

            console.log("✅ M.R.Gesa System Online!");
            
            // Owner ට පණිවිඩයක් යැවීම
            const ownerJid = config.OWNER_NUM + "@s.whatsapp.net";
            await bot.sendMessage(ownerJid, {
                image: { url: "https://github.com/gesandu1111/2026-2/blob/main/WhatsApp%20Image%202025-12-31%20at%2010.33.02.jpeg?raw=true" },
                caption: "> *M.R.Gesa Professional Connected Successfully* ✅\n\n*Status:* High Performance Mode\n*Prefix:* " + prefix
            });
        }
    });

    bot.ev.on("creds.update", saveCreds);

    // ================= MESSAGE HANDLER =================
    bot.ev.on("messages.upsert", async (mek) => {
        try {
            mek = mek.messages[0];
            if (!mek.message || mek.key.remoteJid === "status@broadcast") return;

            const m = sms(bot, mek);
            const type = getContentType(mek.message);
            const from = mek.key.remoteJid;
            
            const body = (type === "conversation") ? mek.message.conversation :
                         (type === "extendedTextMessage") ? mek.message.extendedTextMessage.text :
                         (type === "imageMessage") ? mek.message.imageMessage.caption :
                         (type === "videoMessage") ? mek.message.videoMessage.caption : "";

            const isCmd = body.startsWith(prefix);
            const command = isCmd ? body.slice(prefix.length).trim().split(" ")[0].toLowerCase() : "";
            const args = body.trim().split(/ +/).slice(1);
            const q = args.join(" ");
            
            const botNumber = bot.user.id.split(":")[0];
            const sender = mek.key.fromMe ? botNumber + "@s.whatsapp.net" : (mek.key.participant || mek.key.remoteJid);
            const senderNumber = sender.split("@")[0];
            
            const isOwner = config.OWNER_NUM.includes(senderNumber) || botNumber === senderNumber;
            const pushname = mek.pushName || "User";
            const isGroup = from.endsWith("@g.us");

            const reply = (text) => bot.sendMessage(from, { text }, { quoted: mek });

            // Command Execution
            const events = require("./command");
            if (isCmd) {
                const cmd = events.commands.find((c) => c.pattern === command) || 
                            events.commands.find((c) => c.alias && c.alias.includes(command));

                if (cmd) {
                    await cmd.function(bot, mek, m, {
                        from, body, command, args, q, isGroup, sender, 
                        senderNumber, botNumber, pushname, isOwner, reply,
                    });
                }
            }
        } catch (e) {
            console.error("⚠️ Handler Error:", e);
        }
    });
}

// ================= SERVER & START =================
app.get("/", (req, res) => res.send("M.R.Gesa Pro Server Active ✅"));
app.listen(port, () => console.log(`🌍 Web Server on port ${port}`));

// ආරම්භය ප්‍රමාද කිරීම (Database එකට කාලය ලබා දීමට)
setTimeout(() => {
    connectToWA();
}, 2000);