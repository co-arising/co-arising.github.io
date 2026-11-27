// Handwritten runnable HTTP server entrypoint for bank-wealth/bankwealth
// Wires bounded @cloze handlers into the generated Onion Architecture bootstrap module.
import { startServer } from "../generated-scaffold/ts/modules/bootstrap.ts";
import { cashFundPurchaseHandler } from "./cash-fund-purchase.cloze.ts";
import { taBridgeSettlementHandler } from "./ta-bridge-settlement.cloze.ts";

const port = Number(process.env.PORT ?? 3000);
const handlers = {
  "CashFundPurchase": cashFundPurchaseHandler,
  "TaBridgeSettlement": taBridgeSettlementHandler,
};

const server = startServer({ port, handlers });
server.on("listening", () => {
  const addr = server.address();
  const boundPort = typeof addr === "object" && addr ? addr.port : port;
  process.stdout.write("[co-arising] bank-wealth/bankwealth listening on http://127.0.0.1:" + boundPort + "\n");
});
