import { test } from "@playwright/test";
import { waitForSocket } from "./helpers";

test("o cliente Socket.IO conecta ao servidor simulado e é identificado", async ({
  page,
}) => {
  const logs: string[] = [];
  page.on("console", (m) => logs.push(`${m.type()}: ${m.text()}`));

  await page.goto("/");
  try {
    await waitForSocket(page, "guest");
  } catch (e) {
    const html = page.locator("html");
    const info = {
      socket: await html.getAttribute("data-socket"),
      erro: await html.getAttribute("data-socket-error"),
      ack: await html.getAttribute("data-socket-ack"),
    };
    throw new Error(
      `Socket não conectou: ${JSON.stringify(info)}\n${logs.slice(-15).join("\n")}`,
      { cause: e },
    );
  }
});
