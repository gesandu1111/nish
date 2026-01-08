const { readEnv } = require("../lib/database");
const { cmd, commands } = require("../command");

cmd({
    pattern: "menu",
    alias: ["getmenu"],
    desc: "Get full command list",
    category: "main",
    react: "📜",
    filename: __filename
},
async (bot, mek, m, { from, pushname, reply }) => {
    try {
        const config = await readEnv();
        let menuStr = `👋 *Hello ${pushname}*\n\n`;
        
        let categories = ["main", "download", "group", "owner", "convert", "search"];
        
        categories.forEach(cat => {
            let catCommands = commands.filter(c => c.category === cat && !c.dontAddCommandList);
            if (catCommands.length > 0) {
                menuStr += `| *${cat.toUpperCase()} COMMANDS* |\n`;
                catCommands.forEach(command => {
                    menuStr += `▫️ ${config.PREFIX}${command.pattern}\n`;
                });
                menuStr += `\n`;
            }
        });

        menuStr += `🥶 *𝐌𝐚𝐝𝐞 𝐛𝐲 𝐒_𝐈_𝐇_𝐈_𝐋_𝐄_𝐋* 🥶`;

        await bot.sendMessage(from, {
            image: { url: "https://github.com/gesandu1111/2026-2/blob/main/WhatsApp%20Image%202025-12-31%20at%2010.33.02.jpeg?raw=true" },
            caption: menuStr
        }, { quoted: mek });

    } catch (e) {
        console.log(e);
        reply(`❌ Error: ${e}`);
    }
});