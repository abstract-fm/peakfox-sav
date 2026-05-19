const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");

process.env.ZENDESK_EMAIL = "agent@example.com";
process.env.ZENDESK_TOKEN = "zendesk-token";
process.env.ZENDESK_DOMAIN = "example.zendesk.com";
process.env.ALLOWED_ORIGINS = "https://support.example.com";

const originalFetch = global.fetch;
const originalConsoleError = console.error;
const handler = require("../api/zendesk");

let requestId = 0;

before(() => {
  console.error = () => {};
});

after(() => {
  global.fetch = originalFetch;
  console.error = originalConsoleError;
});

function validBody(overrides = {}) {
  return {
    email: "customer@example.com",
    orderNumber: "123456",
    tracking: "",
    returnId: "",
    note: "Message client",
    category: "Annuler ma commande",
    categoryId: "annulation",
    subIssue: "Annuler ma commande",
    subIssueId: "annulation",
    orderStatusOms: "",
    pathIds: ["annulation"],
    formRenderedAt: Date.now() - 5000,
    companyWebsite: "",
    ...overrides
  };
}

function createReq(body) {
  requestId += 1;

  return {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://support.example.com",
      "x-forwarded-for": `203.0.113.${requestId}`
    },
    body
  };
}

function createRes() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
}

async function postZendesk(body) {
  const req = createReq(body);
  const res = createRes();
  await handler(req, res);
  return res;
}

function mockZendeskSuccess(ticketId = 12345) {
  const calls = [];

  global.fetch = async (url, options) => {
    calls.push({ url, options });
    return {
      ok: true,
      status: 201,
      text: async () => JSON.stringify({ ticket: { id: ticketId } })
    };
  };

  return calls;
}

test("rejects missing required fields before calling Zendesk", async () => {
  const calls = mockZendeskSuccess();
  const res = await postZendesk(validBody({ orderNumber: "" }));

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error, "Numero de commande requis.");
  assert.equal(calls.length, 0);
});

test("rejects invalid email before calling Zendesk", async () => {
  const calls = mockZendeskSuccess();
  const res = await postZendesk(validBody({ email: "not-an-email" }));

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error, "Adresse e-mail invalide.");
  assert.equal(calls.length, 0);
});

test("returns a clean message when an order lookup reports not found", async () => {
  const calls = mockZendeskSuccess();
  const res = await postZendesk(validBody({ orderLookupStatus: "not_found" }));

  assert.equal(res.statusCode, 400);
  assert.equal(
    res.body.error,
    "Cette commande est introuvable. Verifiez le numero saisi ou contactez-nous directement."
  );
  assert.equal(calls.length, 0);
});

test("maps configured custom fields and generates Zendesk tags", async () => {
  const calls = mockZendeskSuccess(987);
  const res = await postZendesk(validBody({
    category: "Probleme de livraison / suivi",
    categoryId: "suivi",
    subIssue: "Probleme avec le point relais",
    subIssueId: "suivi_relais",
    orderStatusOms: "",
    tracking: "TRACK-123",
    pathIds: ["suivi", "suivi_relais"]
  }));

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { success: true, ticketId: 987 });
  assert.equal(calls.length, 1);

  const payload = JSON.parse(calls[0].options.body);
  const customFields = new Map(payload.ticket.custom_fields.map(field => [field.id, field.value]));

  assert.equal(customFields.get(48861773075348), "delivery_issue");
  assert.equal(customFields.get(48861884014740), "pickup_point_issue");
  assert.equal(customFields.get(48861908767892), "123456");
  assert.equal(customFields.get(48861894437780), "TRACK-123");
  assert.ok(payload.ticket.tags.includes("sav_formulaire"));
  assert.ok(payload.ticket.tags.includes("suivi"));
  assert.ok(payload.ticket.tags.includes("suivi_relais"));
});

test("builds the Zendesk ticket payload from sanitized submission data", async () => {
  const calls = mockZendeskSuccess(2468);
  const res = await postZendesk(validBody({
    orderNumber: "#98 76",
    note: "Merci de traiter cette demande.",
    category: "Retour / échange",
    categoryId: "retour",
    subIssue: "Autre problème",
    subIssueId: "retour_probleme_autre",
    orderStatusOms: "",
    pathIds: ["retour", "retour_non_probleme", "retour_probleme_autre"]
  }));

  assert.equal(res.statusCode, 200);

  const payload = JSON.parse(calls[0].options.body);
  assert.deepEqual(payload.ticket.requester, {
    name: "customer@example.com",
    email: "customer@example.com"
  });
  assert.equal(payload.ticket.subject, "[SAV] Retour / échange - Autre problème - Commande 9876");
  assert.equal(payload.ticket.comment.body, "Merci de traiter cette demande.");
  assert.equal(payload.ticket.custom_fields.find(field => field.id === 48861908767892).value, "9876");
});

test("returns a generic error when Zendesk rejects ticket creation", async () => {
  global.fetch = async () => ({
    ok: false,
    status: 503,
    text: async () => JSON.stringify({ error: "upstream unavailable" })
  });

  const res = await postZendesk(validBody());

  assert.equal(res.statusCode, 503);
  assert.deepEqual(res.body, {
    error: "Impossible de creer la demande pour le moment."
  });
});

test("returns a timeout message when Zendesk does not respond in time", async () => {
  global.fetch = async () => {
    const error = new Error("The operation was aborted");
    error.name = "TimeoutError";
    throw error;
  };

  const res = await postZendesk(validBody());

  assert.equal(res.statusCode, 504);
  assert.deepEqual(res.body, {
    error: "Le serveur met trop de temps a repondre. Reessayez dans quelques instants."
  });
});

test("returns a clean service message when Zendesk env config is missing", async () => {
  const previousToken = process.env.ZENDESK_TOKEN;
  delete process.env.ZENDESK_TOKEN;

  try {
    const calls = mockZendeskSuccess();
    const res = await postZendesk(validBody());

    assert.equal(res.statusCode, 500);
    assert.deepEqual(res.body, {
      error: "Service temporairement indisponible."
    });
    assert.equal(calls.length, 0);
  } finally {
    process.env.ZENDESK_TOKEN = previousToken;
  }
});

test("rejects spam honeypot submissions before calling Zendesk", async () => {
  const calls = mockZendeskSuccess();
  const res = await postZendesk(validBody({ companyWebsite: "https://spam.example" }));

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error, "Requete invalide.");
  assert.equal(calls.length, 0);
});
