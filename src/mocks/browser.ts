import { setupWorker } from "msw/browser";
import { handlers } from "./handlers";
import "./devtools";

export const worker = setupWorker(...handlers);
