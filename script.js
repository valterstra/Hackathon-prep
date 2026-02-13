const AGENT_ENDPOINT = window.location.origin + "/api/agent";

const form = document.querySelector("#search");
const messageEl = document.querySelector("#formMessage");
const resultsListEl = document.querySelector("#resultsList");

const tripTypeEl = document.querySelector("#tripType");
const returnInputEl = document.querySelector("#return");
const returnFieldRowEl = returnInputEl.closest(".field-row");

const chatFormEl = document.querySelector("#chatForm");
const chatInputEl = document.querySelector("#chatInput");
const chatMessagesEl = document.querySelector("#chatMessages");
const chatWidgetEl = document.querySelector("#chatWidget");
const chatToggleEl = document.querySelector("#chatToggle");
const chatCloseBtnEl = document.querySelector("#chatCloseBtn");

const chatState = {
  sessionId: `session_${Date.now()}`,
  pendingFields: {
    from: null,
    to: null,
    trip_type: null,
    departure: null,
    return: null,
    passengers: null,
    travel_class: null
  },
  awaitingConfirmation: false,
  lastProposedFields: null
};

function showMessage(text, type) {
  messageEl.textContent = text;
  messageEl.className = `form-message ${type}`;
}

function clearMessage() {
  messageEl.textContent = "";
  messageEl.className = "form-message";
}

function addChatMessage(role, text) {
  const message = document.createElement("p");
  message.className = `chat-message ${role}`;
  message.textContent = text;
  chatMessagesEl.appendChild(message);
  chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
}

function buildMockResults(from, to, passengers) {
  const basePrices = [129, 189, 249];
  return basePrices.map((price, index) => ({
    airline: ["SkyBridge Air", "NorthJet", "Blue Horizon"][index],
    route: `${from} -> ${to}`,
    time: ["08:15", "12:40", "18:05"][index],
    total: price * passengers
  }));
}

function renderResults(results) {
  resultsListEl.innerHTML = "";
  results.forEach((item) => {
    const card = document.createElement("article");
    card.className = "result-card";
    card.innerHTML = `
      <div>
        <p><strong>${item.airline}</strong></p>
        <p>${item.route}</p>
        <p>Departure ${item.time}</p>
      </div>
      <p class="price">EUR ${item.total}</p>
    `;
    resultsListEl.appendChild(card);
  });
}

function setTripTypeMode(tripType) {
  const oneWay = tripType === "one_way";
  returnInputEl.disabled = oneWay;
  returnInputEl.required = !oneWay;
  if (oneWay) {
    returnInputEl.value = "";
  }
  returnFieldRowEl.classList.toggle("is-disabled", oneWay);
}

function validateAndSearch() {
  clearMessage();

  const from = form.from.value.trim();
  const to = form.to.value.trim();
  const departure = form.departure.value;
  const returnDate = form.return.value;
  const passengers = Number(form.passengers.value);
  const travelClass = form.travelClass.value;
  const tripType = form.tripType.value;

  if (!from || !to || !departure) {
    showMessage("Please fill in From, To, and Departure.", "error");
    return false;
  }

  if (from.toLowerCase() === to.toLowerCase()) {
    showMessage("From and To cannot be the same destination.", "error");
    return false;
  }

  if (tripType === "round_trip") {
    if (!returnDate) {
      showMessage("Return date is required for round-trip.", "error");
      return false;
    }
    if (new Date(returnDate) <= new Date(departure)) {
      showMessage("Return date must be after departure date.", "error");
      return false;
    }
  }

  if (!Number.isInteger(passengers) || passengers < 1 || passengers > 9) {
    showMessage("Passengers must be between 1 and 9.", "error");
    return false;
  }

  const results = buildMockResults(from, to, passengers);
  renderResults(results);

  const tripText = tripType === "one_way" ? "one-way" : "round-trip";
  showMessage(`Found ${results.length} ${travelClass} ${tripText} options.`, "success");
  return true;
}

function applyFieldsToForm(fields) {
  if (!fields) {
    return;
  }

  if (fields.from) {
    form.from.value = fields.from;
  }
  if (fields.to) {
    form.to.value = fields.to;
  }
  if (fields.trip_type) {
    form.tripType.value = fields.trip_type;
    setTripTypeMode(fields.trip_type);
  }
  if (fields.departure) {
    form.departure.value = fields.departure;
  }
  if (fields.return) {
    form.return.value = fields.return;
  }
  if (fields.passengers) {
    form.passengers.value = fields.passengers;
  }
  if (fields.travel_class) {
    const target = fields.travel_class.toLowerCase();
    const option = Array.from(form.travelClass.options).find((item) => {
      return item.value.toLowerCase() === target;
    });
    if (option) {
      form.travelClass.value = option.value;
    }
  }
}

async function sendChatMessageToAgent(text) {
  const payload = {
    session_id: chatState.sessionId,
    message: text,
    context: {
      pending_fields: chatState.pendingFields,
      awaiting_confirmation: chatState.awaitingConfirmation
    }
  };

  const response = await fetch(AGENT_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("Assistant request failed.");
  }

  return response.json();
}

function mergePendingFields(fields) {
  chatState.pendingFields = { ...chatState.pendingFields, ...fields };
}

function openChatWidget() {
  chatWidgetEl.classList.add("is-open");
  chatWidgetEl.setAttribute("aria-hidden", "false");
  chatToggleEl.setAttribute("aria-expanded", "true");
  chatInputEl.focus();
}

function closeChatWidget() {
  chatWidgetEl.classList.remove("is-open");
  chatWidgetEl.setAttribute("aria-hidden", "true");
  chatToggleEl.setAttribute("aria-expanded", "false");
}

function toggleChatWidget() {
  if (chatWidgetEl.classList.contains("is-open")) {
    closeChatWidget();
  } else {
    openChatWidget();
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  validateAndSearch();
});

tripTypeEl.addEventListener("change", (event) => {
  setTripTypeMode(event.target.value);
});

chatFormEl.addEventListener("submit", async (event) => {
  event.preventDefault();
  const rawText = chatInputEl.value.trim();
  if (!rawText) {
    return;
  }

  addChatMessage("user", rawText);
  chatInputEl.value = "";

  try {
    const result = await sendChatMessageToAgent(rawText);

    if (result.proposed_fields) {
      mergePendingFields(result.proposed_fields);
    }

    if (result.assistant_message) {
      addChatMessage("assistant", result.assistant_message);
    }

    if (result.type === "ai_unavailable") {
      chatState.awaitingConfirmation = false;
      chatState.lastProposedFields = null;
      return;
    }

    if (result.type === "ready_to_fill" && result.proposed_fields) {
      chatState.awaitingConfirmation = true;
      chatState.lastProposedFields = result.proposed_fields;
      return;
    }

    if (result.type === "confirmed_fill") {
      chatState.awaitingConfirmation = false;
      applyFieldsToForm(chatState.lastProposedFields || result.proposed_fields);
      validateAndSearch();
      chatState.lastProposedFields = null;
      return;
    }

    chatState.awaitingConfirmation = result.type === "ready_to_fill";
  } catch (error) {
    addChatMessage("assistant", "I could not process that. Check that the backend is running and OPENAI_API_KEY is configured.");
  }
});

chatToggleEl.addEventListener("click", toggleChatWidget);
chatCloseBtnEl.addEventListener("click", closeChatWidget);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && chatWidgetEl.classList.contains("is-open")) {
    closeChatWidget();
  }
});

setTripTypeMode(form.tripType.value);
addChatMessage("assistant", "Hi. Tell me your trip in plain language (English or Swedish), then confirm with yes/ja.");
