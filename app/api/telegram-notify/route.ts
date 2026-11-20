import { NextRequest, NextResponse } from "next/server";

const BOT_TOKEN = "8969568321:AAH66If1hS58zFugfwj-EiFK7HeGWgQ4JUc";
const CHAT_USER = "8987478627";
const CHAT_GROUP = "-1004383006162";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mensagem, destino = "ambos", customToken } = body;

    const token = customToken || BOT_TOKEN;
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const destinos: string[] = [];

    if (destino === "usuario" || destino === "ambos") destinos.push(CHAT_USER);
    if (destino === "grupo" || destino === "ambos") destinos.push(CHAT_GROUP);

    const results = [];

    for (const chatId of destinos) {
      const payload = {
        chat_id: chatId,
        text: mensagem,
        parse_mode: "HTML",
      };

      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const resData = await response.json();
        results.push({ chatId, ok: response.ok, data: resData });
      } catch (err: any) {
        results.push({ chatId, ok: false, error: err.message });
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao enviar notificação" },
      { status: 500 }
    );
  }
}
