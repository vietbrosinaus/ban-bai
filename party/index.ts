import { routePartykitRequest } from "partyserver";

export { Table } from "./table";

const worker = {
  async fetch(request: Request, env: Env) {
    return (await routePartykitRequest(request, env)) ?? new Response("Not found", { status: 404 });
  },
};

export default worker;
