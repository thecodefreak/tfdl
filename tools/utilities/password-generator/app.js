(() => {
  const LOWERCASE = "abcdefghijklmnopqrstuvwxyz";
  const UPPERCASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const DIGITS = "0123456789";
  const DEFAULT_SYMBOLS = "!@#$%^&*()-_=+[]{};:,.?/~";
  const DEFAULT_PASSPHRASE_SYMBOLS = "!@#$%&*?";
  const AMBIGUOUS_PASSWORD_CHARS = new Set(["0", "O", "o", "1", "l", "I", "|", "`", "'", '"']);
  const WORD_LIST = `
    amber anchor angle apple april arcade archer arrow ash atlas attic audio aurora autumn avenue badge bakery bamboo banner barley barrel beacon berry bicycle biscuit blade blossom bluebonnet bolt border bottle breeze brick bridge brook brush cabin cactus candle canyon captain caravan carbon cedar center ceramic chalk cherry chest cider circle cliff clover cobalt comet compass coral cotton crane creek crescent cricket crimson crown crystal current cypress daisy delta denim desert drift dune dusk eagle earth echo ember engine estuary evergreen falcon feather fern festival field firefly flame flint flour forest fossil fox frost galaxy garden garnet glacier glow granite grove harbor harvest hazel hearth hill horizon ivory jasmine jewel juniper kettle lantern lavender library lilac linen locket maple meadow mercury mesa midnight mineral mint mist moonbeam morning moss mountain nectar needle nickel north oak oasis ocean olive opal orbit orchard origin pebble pepper pine planet plaza pollen quartz quill rain raven reef river robin rocket rose ruby saddle saffron sage sail shadow shell shore silver skylight slate snow solar song sparrow spruce spring stone storm summit sunrise sunset surf swift thistle thunder timber topaz tower valley velvet violet walnut wave willow wind winter yarrow zephyr
    able agile airy amberly ancient apricot arctic aspen astral atomic auburn balanced basil bright brisk bronze calm candid cedar charted cheerful coastal copper cosmic dapper dashing dawned deluxe embered emerald evenfield fine gentle golden grand grassy harboring honeyed inland iron keen kindled lunar mellow minty modern mossy noble northern open orchardy polished prairie quiet radiant rapid redwood riverine rustic salted sandy scarlet serene shaded shining silken silvered simple smoky snowy solar soft spoken spruce starlit steady summer swift timbered tranquil true velvet warm west wild willowy wintery wise wooded
    acorn afterglow airfield airplane almond antler apricot bayou beehive birch boathouse bonfire bookcase braid brass brookside buckler butter cabinwood campfire canary canteen cardinal carousel cashmere castle catapult causeway chalkboard champion charcoal chestnut citadel coastline coconut copperhead corduroy courtyard crosswind daybreak deckhouse dragonfly drawbridge driftwood earthlight eastwind emberglow evergreenfield fairway farmhouse fernbank fieldstone firebrand firelight foothill fountain foxglove freestone frostline gatehouse gearsmith gemstone gingerbread glasswork goldleaf goldrush grainfield greenhouse halcyon handcraft harborlight hearthstone hedgeway highland hillside honeycomb horseshoe inkwell ironwood islander ivybridge jetstream junebug kingfisher lakeside lamplight landfall leafpile lighthouse limeade longleaf lowland marshland meadowlark moonrise moonstone northfield oakwood oldtown orchardgate overland parchment patchwork pathfinder pinecone pinegrove plainstone plumtree pondside quartzite quicksilver raincloud rainwater redstone ridgeline riverside rookery sandbar sandstone seastone shoreline skygarden snowfield southridge springboard starboard starfield starglass stonepath sunbeam sundial sunfield sunlight tidepool torchlight trailhead treasuretree turnpike upland vineyard wayfinder westfield wheatfield wildflower windfall windmill woodland yardbird
    alpha bravo charlie delta echo foxtrot golf hotel india juliet kilo lima mango nectar oscar papa quasar romeo sierra tango uniform vector whiskey xray yankee zulu
    apron artist baker banner barista basket beacon boardwalk bookseller bottling branchwork brewer brickwork brightwork cabinmate cartwheel caretaker carpenter carver cashew checker chimney ciderpress climber clockmaker cloudbank cobblestone coffeehouse craftwork daylily dewdrop dockside eastgate elderberry emberstone farmstead fieldwork finch flagstone florist forester freeway gardenpath goldsmith grainmill groundswell handrail handmade headland hillsidepath honeyfield horseman houseboat icehouse ironbridge jigsaw keyhole landmark landbridge leafwork lockbox lookout lowtide marketplace millstone moonpath northgate nutmeg oakleaf oldbridge orchardist outpost overpass paperkite parkland pathway pearwood pebblestone pilot pinebark postcard quayside railcar rainline rancher redcliff ringbolt riverbend roadstead rooftop rootcellar sailboat sailmaker saltbox sandhill sawdust seaglass shipyard shorelinepath signalfire skylane songbird southgate stairwell startrail stonebridge streetlamp sugarpine suntrail surfline sweetgrass tableland taproom teacup tideway trailstone treehouse turnstone uplands villagepath waterline wheelhouse windward woodshop
    basilica bonanza boulevard braille cadence cantrip capstone carepath charmwork chronicle circuit cityscape clearwater cloudline compasspoint courtyardpath craftlane creekbend crossroad daylight downriver eastbank edgewood emberpath evergreenway fairlight farshore fieldpath firecrest foothold forepath gatepost glimmer goldcrest grandview greenline harborview hearthpath highcrest highwater hillcrest ironpath jadefield juniperberry lakeview leafline lightpath longview lowcrest marshview meadowpath millbrook mooncrest northview oakcrest oldharbor orchardview parkview pineview plainview quaybridge quickpath rivercrest ridgeview rosewood saltwater seaview shoreview skylightpath springview starview stoneview suncrest tidecrest trailview valleyview westview wildview windcrest woodcrest
  `
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const refs = {
    panel: document.querySelector(".passgen-panel"),
    modePasswordBtn: document.querySelector("#modePasswordBtn"),
    modePassphraseBtn: document.querySelector("#modePassphraseBtn"),
    passwordConfigCard: document.querySelector("#passwordConfigCard"),
    passphraseConfigCard: document.querySelector("#passphraseConfigCard"),
    generateBtn: document.querySelector("#generateBtn"),
    regenerateSecondaryBtn: document.querySelector("#regenerateSecondaryBtn"),
    copyPrimaryBtn: document.querySelector("#copyPrimaryBtn"),
    copyAllBtn: document.querySelector("#copyAllBtn"),
    selectPrimaryBtn: document.querySelector("#selectPrimaryBtn"),
    liveRegenerateToggle: document.querySelector("#liveRegenerateToggle"),
    resultCountInput: document.querySelector("#resultCountInput"),
    passwordLengthRange: document.querySelector("#passwordLengthRange"),
    passwordLengthInput: document.querySelector("#passwordLengthInput"),
    includeLowercaseToggle: document.querySelector("#includeLowercaseToggle"),
    includeUppercaseToggle: document.querySelector("#includeUppercaseToggle"),
    includeNumbersToggle: document.querySelector("#includeNumbersToggle"),
    includeSymbolsToggle: document.querySelector("#includeSymbolsToggle"),
    symbolsInput: document.querySelector("#symbolsInput"),
    requireEachSetToggle: document.querySelector("#requireEachSetToggle"),
    excludeAmbiguousToggle: document.querySelector("#excludeAmbiguousToggle"),
    passphraseWordsRange: document.querySelector("#passphraseWordsRange"),
    passphraseWordsInput: document.querySelector("#passphraseWordsInput"),
    separatorSelect: document.querySelector("#separatorSelect"),
    customSeparatorField: document.querySelector("#customSeparatorField"),
    customSeparatorInput: document.querySelector("#customSeparatorInput"),
    wordCaseSelect: document.querySelector("#wordCaseSelect"),
    appendNumberToggle: document.querySelector("#appendNumberToggle"),
    appendDigitsInput: document.querySelector("#appendDigitsInput"),
    appendSymbolToggle: document.querySelector("#appendSymbolToggle"),
    passphraseSymbolInput: document.querySelector("#passphraseSymbolInput"),
    primaryOutput: document.querySelector("#primaryOutput"),
    resultList: document.querySelector("#resultList"),
    emptyResults: document.querySelector("#emptyResults"),
    batchMeta: document.querySelector("#batchMeta"),
    statusBadge: document.querySelector("#statusBadge"),
    statusMessage: document.querySelector("#statusMessage"),
    metricMode: document.querySelector("#metricMode"),
    metricEntropy: document.querySelector("#metricEntropy"),
    metricStrength: document.querySelector("#metricStrength"),
    metricLength: document.querySelector("#metricLength"),
    metricCount: document.querySelector("#metricCount"),
    metricRng: document.querySelector("#metricRng"),
    detailModeHint: document.querySelector("#detailModeHint"),
    detailList: document.querySelector("#detailList"),
    warningList: document.querySelector("#warningList")
  };

  if (!refs.panel || !refs.generateBtn || !refs.resultList) {
    return;
  }

  const hasCryptoRandom = Boolean(globalThis.crypto && typeof globalThis.crypto.getRandomValues === "function");
  const randomBuf = hasCryptoRandom ? new Uint32Array(1) : null;

  const state = {
    mode: "password",
    results: [],
    activeResultIndex: 0,
    debounceId: 0
  };

  refs.metricRng.textContent = hasCryptoRandom ? "crypto" : "fallback";

  bindEvents();
  syncLinkedNumberAndRange(refs.passwordLengthInput, refs.passwordLengthRange, 6, 128);
  syncLinkedNumberAndRange(refs.passphraseWordsInput, refs.passphraseWordsRange, 3, 12);
  clampNumericInput(refs.resultCountInput, 1, 20, 6);
  clampNumericInput(refs.appendDigitsInput, 1, 8, 2);
  syncModeUI();
  syncFieldStates();
  generateAndRender("init");

  function bindEvents() {
    refs.modePasswordBtn?.addEventListener("click", () => setMode("password"));
    refs.modePassphraseBtn?.addEventListener("click", () => setMode("passphrase"));

    refs.generateBtn?.addEventListener("click", () => generateAndRender("manual"));
    refs.regenerateSecondaryBtn?.addEventListener("click", () => generateAndRender("manual"));
    refs.copyPrimaryBtn?.addEventListener("click", (event) => copyPrimary(event.currentTarget));
    refs.copyAllBtn?.addEventListener("click", (event) => copyAll(event.currentTarget));
    refs.selectPrimaryBtn?.addEventListener("click", () => selectPrimary());

    refs.resultList?.addEventListener("click", onResultListClick);

    refs.panel.addEventListener("input", onOptionsChanged);
    refs.panel.addEventListener("change", onOptionsChanged);

    document.addEventListener("keydown", (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        generateAndRender("hotkey");
      }
    });
  }

  function onOptionsChanged(event) {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    if (target === refs.primaryOutput) return;

    if (target === refs.passwordLengthInput || target === refs.passwordLengthRange) {
      syncLinkedNumberAndRange(
        refs.passwordLengthInput,
        refs.passwordLengthRange,
        6,
        128,
        target === refs.passwordLengthRange ? "range" : "number"
      );
    }
    if (target === refs.passphraseWordsInput || target === refs.passphraseWordsRange) {
      syncLinkedNumberAndRange(
        refs.passphraseWordsInput,
        refs.passphraseWordsRange,
        3,
        12,
        target === refs.passphraseWordsRange ? "range" : "number"
      );
    }
    if (target === refs.resultCountInput) {
      clampNumericInput(refs.resultCountInput, 1, 20, 6);
    }
    if (target === refs.appendDigitsInput) {
      clampNumericInput(refs.appendDigitsInput, 1, 8, 2);
    }
    if (target === refs.separatorSelect) {
      syncFieldStates();
    }
    if (target === refs.includeSymbolsToggle || target === refs.appendNumberToggle || target === refs.appendSymbolToggle) {
      syncFieldStates();
    }

    if (refs.liveRegenerateToggle?.checked) {
      scheduleGenerate();
    }
  }

  function onResultListClick(event) {
    const target = event.target instanceof HTMLElement ? event.target.closest("button[data-action]") : null;
    if (!(target instanceof HTMLButtonElement)) return;

    const action = target.dataset.action;
    const index = Number.parseInt(target.dataset.index || "0", 10);
    if (!Number.isFinite(index) || index < 0 || index >= state.results.length) return;

    if (action === "copy-result") {
      copyText(state.results[index].value).then((ok) => {
        if (ok) {
          flashButton(target, "Copied");
          setStatus("ok", `Copied result ${index + 1}.`);
        } else {
          setStatus("warn", "Copy failed in this browser. Select and copy manually.");
        }
      });
      return;
    }

    if (action === "use-result") {
      state.activeResultIndex = index;
      renderPrimaryOutput();
      renderResultList();
      setStatus("ok", `Selected result ${index + 1} as primary.`);
    }
  }

  function setMode(nextMode) {
    if (nextMode !== "password" && nextMode !== "passphrase") return;
    if (state.mode === nextMode) return;
    state.mode = nextMode;
    state.activeResultIndex = 0;
    syncModeUI();
    syncFieldStates();
    if (refs.liveRegenerateToggle?.checked) {
      generateAndRender("mode-change");
    } else {
      setStatus("idle", `Mode switched to ${nextMode}. Click Generate.`);
      renderMetricsPlaceholder();
      renderDetails([], []);
    }
  }

  function syncModeUI() {
    const isPassword = state.mode === "password";

    refs.modePasswordBtn?.setAttribute("aria-pressed", String(isPassword));
    refs.modePassphraseBtn?.setAttribute("aria-pressed", String(!isPassword));
    refs.modePasswordBtn?.classList.toggle("is-active", isPassword);
    refs.modePassphraseBtn?.classList.toggle("is-active", !isPassword);

    refs.passwordConfigCard?.classList.toggle("is-hidden", !isPassword);
    refs.passphraseConfigCard?.classList.toggle("is-hidden", isPassword);
    if (refs.detailModeHint) refs.detailModeHint.textContent = state.mode;
  }

  function syncFieldStates() {
    const separatorMode = refs.separatorSelect?.value || "-";
    refs.customSeparatorField?.classList.toggle("is-hidden", separatorMode !== "custom");

    const passwordSymbolsEnabled = Boolean(refs.includeSymbolsToggle?.checked);
    if (refs.symbolsInput) refs.symbolsInput.disabled = !passwordSymbolsEnabled;

    const appendNumberEnabled = Boolean(refs.appendNumberToggle?.checked);
    if (refs.appendDigitsInput) refs.appendDigitsInput.disabled = !appendNumberEnabled;

    const appendSymbolEnabled = Boolean(refs.appendSymbolToggle?.checked);
    if (refs.passphraseSymbolInput) refs.passphraseSymbolInput.disabled = !appendSymbolEnabled;
  }

  function scheduleGenerate() {
    if (state.debounceId) {
      window.clearTimeout(state.debounceId);
    }
    state.debounceId = window.setTimeout(() => {
      state.debounceId = 0;
      generateAndRender("live");
    }, 120);
  }

  function generateAndRender(source) {
    if (state.debounceId) {
      window.clearTimeout(state.debounceId);
      state.debounceId = 0;
    }

    try {
      const batchCount = clamp(readInt(refs.resultCountInput, 6), 1, 20);
      const model = state.mode === "password" ? buildPasswordBatch(batchCount) : buildPassphraseBatch(batchCount);
      state.results = model.items;
      state.activeResultIndex = 0;

      renderPrimaryOutput();
      renderResultList();
      renderMetrics(model.summary);
      renderDetails(model.details, model.warnings);
      setStatus(model.summary.status, model.summary.message);

      if (!hasCryptoRandom && source !== "live") {
        appendWarningOnce("Web Crypto is unavailable; using Math.random fallback. Do not use for high-risk credentials.");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to generate values.";
      state.results = [];
      state.activeResultIndex = 0;
      renderPrimaryOutput();
      renderResultList();
      renderMetricsPlaceholder();
      renderDetails([], [message]);
      setStatus("error", message);
    }
  }

  function buildPasswordBatch(batchCount) {
    const passwordLength = clamp(readInt(refs.passwordLengthInput, 20), 6, 128);
    const includeLowercase = Boolean(refs.includeLowercaseToggle?.checked);
    const includeUppercase = Boolean(refs.includeUppercaseToggle?.checked);
    const includeNumbers = Boolean(refs.includeNumbersToggle?.checked);
    const includeSymbols = Boolean(refs.includeSymbolsToggle?.checked);
    const requireEachSet = Boolean(refs.requireEachSetToggle?.checked);
    const excludeAmbiguous = Boolean(refs.excludeAmbiguousToggle?.checked);
    const rawSymbols = typeof refs.symbolsInput?.value === "string" ? refs.symbolsInput.value : DEFAULT_SYMBOLS;
    const symbolPool = sanitizeCharacterSet(rawSymbols, { removeWhitespace: true, excludeAmbiguous });

    const pools = [];
    if (includeLowercase) pools.push({ label: "lowercase", chars: sanitizeCharacterSet(LOWERCASE, { excludeAmbiguous }) });
    if (includeUppercase) pools.push({ label: "uppercase", chars: sanitizeCharacterSet(UPPERCASE, { excludeAmbiguous }) });
    if (includeNumbers) pools.push({ label: "numbers", chars: sanitizeCharacterSet(DIGITS, { excludeAmbiguous }) });
    if (includeSymbols) pools.push({ label: "symbols", chars: symbolPool });

    const usablePools = pools.filter((pool) => pool.chars.length > 0);
    if (!usablePools.length) {
      throw new Error("Enable at least one character set.");
    }

    if (includeSymbols && symbolPool.length === 0) {
      throw new Error("Symbols are enabled, but the symbols set is empty after filtering.");
    }

    if (requireEachSet && passwordLength < usablePools.length) {
      throw new Error(`Password length must be at least ${usablePools.length} to satisfy the enabled character sets.`);
    }

    const combinedPool = usablePools.map((pool) => pool.chars).join("");
    if (!combinedPool.length) {
      throw new Error("No usable characters remain after applying filters.");
    }

    const charsetSize = new Set(combinedPool).size;
    const entropyBits = passwordLength * log2(charsetSize);
    const items = [];
    for (let i = 0; i < batchCount; i += 1) {
      const value = generatePasswordValue({
        length: passwordLength,
        pools: usablePools,
        combinedPool,
        requireEachSet
      });
      items.push({ value, length: value.length, entropyBits });
    }

    const warnings = [];
    if (passwordLength < 12) warnings.push("Passwords shorter than 12 characters are easier to brute-force.");
    if (charsetSize < 30) warnings.push("Character variety is low. Enable more character sets for stronger output.");
    if (!hasCryptoRandom) warnings.push("Web Crypto is unavailable in this environment; randomness quality is reduced.");

    const strength = getStrength(entropyBits);
    return {
      items,
      details: [
        ["Length", String(passwordLength)],
        ["Enabled sets", usablePools.map((pool) => pool.label).join(", ")],
        ["Charset size", `${charsetSize} unique chars`],
        ["Require each set", requireEachSet ? "yes" : "no"],
        ["Ambiguous filter", excludeAmbiguous ? "on" : "off"],
        ["Symbols set", includeSymbols ? symbolPool || "(empty)" : "disabled"]
      ],
      warnings,
      summary: {
        mode: "password",
        entropyBits,
        strength,
        batchCount,
        lengthLabel: `${passwordLength} chars`,
        status: warnings.length ? "warn" : "ok",
        message: warnings.length
          ? `Generated ${batchCount} password${batchCount === 1 ? "" : "s"} with ${formatBits(entropyBits)} bits estimated entropy (${strength.label.toLowerCase()}).`
          : `Generated ${batchCount} password${batchCount === 1 ? "" : "s"} successfully.`
      }
    };
  }

  function buildPassphraseBatch(batchCount) {
    const wordCount = clamp(readInt(refs.passphraseWordsInput, 7), 3, 12);
    const separator = resolveSeparator(refs.separatorSelect?.value || "-", refs.customSeparatorInput?.value || "~");
    const caseMode = refs.wordCaseSelect?.value || "lower";
    const appendNumber = Boolean(refs.appendNumberToggle?.checked);
    const appendDigits = clamp(readInt(refs.appendDigitsInput, 2), 1, 8);
    const appendSymbol = Boolean(refs.appendSymbolToggle?.checked);
    const symbolPool = sanitizeCharacterSet(
      typeof refs.passphraseSymbolInput?.value === "string" ? refs.passphraseSymbolInput.value : DEFAULT_PASSPHRASE_SYMBOLS,
      { removeWhitespace: true, excludeAmbiguous: false }
    );

    if (appendSymbol && symbolPool.length === 0) {
      throw new Error("Append symbol is enabled, but the passphrase symbol set is empty.");
    }

    const baseEntropy = wordCount * log2(WORD_LIST.length);
    const numberEntropy = appendNumber ? appendDigits * log2(10) : 0;
    const symbolEntropy = appendSymbol ? log2(symbolPool.length) : 0;
    const entropyBits = baseEntropy + numberEntropy + symbolEntropy;

    const items = [];
    for (let i = 0; i < batchCount; i += 1) {
      const words = [];
      for (let j = 0; j < wordCount; j += 1) {
        words.push(transformWordCase(randomChoiceFromArray(WORD_LIST), caseMode));
      }
      if (appendNumber) words.push(randomDigits(appendDigits));
      if (appendSymbol) words.push(randomChoiceFromString(symbolPool));
      const value = words.join(separator);
      items.push({ value, length: value.length, entropyBits });
    }

    const lengths = items.map((item) => item.length);
    const minLength = Math.min(...lengths);
    const maxLength = Math.max(...lengths);
    const lengthLabel = minLength === maxLength ? `${minLength} chars` : `${minLength}-${maxLength} chars`;

    const warnings = [];
    if (wordCount < 6) warnings.push("Use 6+ words for stronger passphrases (or add number/symbol suffixes).");
    if (separator === "") warnings.push("No separator improves compactness but reduces readability.");
    if (!hasCryptoRandom) warnings.push("Web Crypto is unavailable in this environment; randomness quality is reduced.");

    const strength = getStrength(entropyBits);
    return {
      items,
      details: [
        ["Words", String(wordCount)],
        ["Dictionary size", `${WORD_LIST.length} words`],
        ["Separator", separator === " " ? "space" : separator === "" ? "(none)" : separator],
        ["Case mode", caseMode],
        ["Append number", appendNumber ? `${appendDigits} digits` : "off"],
        ["Append symbol", appendSymbol ? symbolPool : "off"]
      ],
      warnings,
      summary: {
        mode: "passphrase",
        entropyBits,
        strength,
        batchCount,
        lengthLabel,
        status: warnings.length ? "warn" : "ok",
        message: warnings.length
          ? `Generated ${batchCount} passphrase${batchCount === 1 ? "" : "s"} with ${formatBits(entropyBits)} bits estimated entropy (${strength.label.toLowerCase()}).`
          : `Generated ${batchCount} passphrase${batchCount === 1 ? "" : "s"} successfully.`
      }
    };
  }

  function generatePasswordValue(config) {
    const chars = [];

    if (config.requireEachSet) {
      for (const pool of config.pools) {
        chars.push(randomChoiceFromString(pool.chars));
      }
    }

    while (chars.length < config.length) {
      chars.push(randomChoiceFromString(config.combinedPool));
    }

    shuffleInPlace(chars);
    return chars.join("");
  }

  function renderPrimaryOutput() {
    const item = state.results[state.activeResultIndex] || null;
    if (!refs.primaryOutput) return;
    refs.primaryOutput.value = item ? item.value : "";
  }

  function renderResultList() {
    const items = state.results;
    if (refs.batchMeta) {
      refs.batchMeta.textContent = `${items.length} item${items.length === 1 ? "" : "s"}`;
    }
    refs.emptyResults?.classList.toggle("is-hidden", items.length > 0);

    if (!items.length) {
      refs.resultList.innerHTML = "";
      return;
    }

    refs.resultList.innerHTML = items
      .map((item, index) => {
        const isPrimary = index === state.activeResultIndex;
        return `
          <li class="passgen-result-item${isPrimary ? " is-primary" : ""}">
            <div class="passgen-result-main">
              <code class="passgen-result-value">${escapeHtml(item.value)}</code>
              <span class="passgen-result-meta mono">${item.length} chars · ${formatBits(item.entropyBits)} bits</span>
            </div>
            <button class="ghost-btn ghost-btn-small" type="button" data-action="use-result" data-index="${index}">Use</button>
            <button class="ghost-btn ghost-btn-small" type="button" data-action="copy-result" data-index="${index}">Copy</button>
          </li>`;
      })
      .join("");
  }

  function renderMetrics(summary) {
    if (!summary) {
      renderMetricsPlaceholder();
      return;
    }

    const strengthLabel = summary.strength?.label || "n/a";
    const strengthClass = summary.strength?.className || "";

    if (refs.metricMode) refs.metricMode.textContent = summary.mode;
    if (refs.metricEntropy) refs.metricEntropy.textContent = `${formatBits(summary.entropyBits)} bits`;
    if (refs.metricLength) refs.metricLength.textContent = summary.lengthLabel;
    if (refs.metricCount) refs.metricCount.textContent = String(summary.batchCount);
    if (refs.metricStrength) {
      refs.metricStrength.textContent = strengthLabel;
      refs.metricStrength.className = strengthClass ? strengthClass : "";
    }
  }

  function renderMetricsPlaceholder() {
    if (refs.metricMode) refs.metricMode.textContent = state.mode;
    if (refs.metricEntropy) refs.metricEntropy.textContent = "0 bits";
    if (refs.metricLength) refs.metricLength.textContent = "0";
    if (refs.metricCount) refs.metricCount.textContent = "0";
    if (refs.metricStrength) {
      refs.metricStrength.textContent = "n/a";
      refs.metricStrength.className = "";
    }
  }

  function renderDetails(details, warnings) {
    refs.detailList.innerHTML = Array.isArray(details)
      ? details
          .map(([key, value]) => `
            <div class="passgen-kv-item">
              <div class="passgen-kv-key">${escapeHtml(String(key))}</div>
              <div class="passgen-kv-value">${escapeHtml(String(value))}</div>
            </div>`)
          .join("")
      : "";

    if (!warnings || !warnings.length) {
      refs.warningList.innerHTML = "";
      refs.warningList.classList.add("is-hidden");
      return;
    }

    refs.warningList.innerHTML = warnings.map((warning) => `<li>${escapeHtml(String(warning))}</li>`).join("");
    refs.warningList.classList.remove("is-hidden");
  }

  function appendWarningOnce(text) {
    if (!refs.warningList) return;
    const current = refs.warningList.textContent || "";
    if (current.includes(text)) return;

    const item = document.createElement("li");
    item.textContent = text;
    refs.warningList.appendChild(item);
    refs.warningList.classList.remove("is-hidden");
  }

  function setStatus(kind, message) {
    const normalized = ["ok", "warn", "error", "idle"].includes(kind) ? kind : "idle";
    if (refs.statusBadge) {
      refs.statusBadge.className = `status-badge ${normalized}`;
      refs.statusBadge.textContent = normalized;
    }
    if (refs.statusMessage) {
      refs.statusMessage.textContent = message || "";
    }
  }

  function copyPrimary(button) {
    const item = state.results[state.activeResultIndex];
    if (!item) {
      setStatus("warn", "Nothing to copy yet. Generate a value first.");
      return;
    }

    copyText(item.value).then((ok) => {
      if (ok) {
        if (button instanceof HTMLButtonElement) flashButton(button, "Copied");
        setStatus("ok", "Copied primary result.");
      } else {
        setStatus("warn", "Copy failed in this browser. Select and copy manually.");
      }
    });
  }

  function copyAll(button) {
    if (!state.results.length) {
      setStatus("warn", "Nothing to copy yet. Generate values first.");
      return;
    }

    const payload = state.results.map((item) => item.value).join("\n");
    copyText(payload).then((ok) => {
      if (ok) {
        if (button instanceof HTMLButtonElement) flashButton(button, "Copied");
        setStatus("ok", `Copied ${state.results.length} result${state.results.length === 1 ? "" : "s"}.`);
      } else {
        setStatus("warn", "Copy failed in this browser. Select and copy manually.");
      }
    });
  }

  function selectPrimary() {
    if (!refs.primaryOutput || !refs.primaryOutput.value) {
      setStatus("warn", "Nothing to select yet.");
      return;
    }
    refs.primaryOutput.focus({ preventScroll: true });
    refs.primaryOutput.select();
    refs.primaryOutput.setSelectionRange(0, refs.primaryOutput.value.length);
    setStatus("ok", "Primary result selected.");
  }

  async function copyText(text) {
    if (!text) return false;

    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      // Fallback below
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    textarea.style.pointerEvents = "none";
    document.body.appendChild(textarea);
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);

    try {
      return Boolean(document.execCommand("copy"));
    } catch {
      return false;
    } finally {
      textarea.remove();
    }
  }

  function flashButton(button, label) {
    if (!(button instanceof HTMLButtonElement)) return;
    const original = button.textContent || "";
    button.textContent = label;
    button.classList.add("copy-ok");
    window.setTimeout(() => {
      button.textContent = original;
      button.classList.remove("copy-ok");
    }, 700);
  }

  function syncLinkedNumberAndRange(numberInput, rangeInput, min, max, source = "number") {
    if (!(numberInput instanceof HTMLInputElement) || !(rangeInput instanceof HTMLInputElement)) return;
    const fallback = readInt(rangeInput, min);
    const rawValue = source === "range" ? readInt(rangeInput, readInt(numberInput, min)) : readInt(numberInput, fallback);
    const value = clamp(rawValue, min, max);
    numberInput.value = String(value);
    rangeInput.value = String(value);
  }

  function clampNumericInput(input, min, max, fallback) {
    if (!(input instanceof HTMLInputElement)) return;
    const value = clamp(readInt(input, fallback), min, max);
    input.value = String(value);
  }

  function readInt(input, fallback) {
    if (!(input instanceof HTMLInputElement)) return fallback;
    const parsed = Number.parseInt(input.value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function resolveSeparator(mode, customValue) {
    if (mode === "space") return " ";
    if (mode === "none") return "";
    if (mode === "custom") {
      const value = (customValue || "").slice(0, 8);
      return value.length ? value : "~";
    }
    return mode || "-";
  }

  function transformWordCase(word, mode) {
    if (mode === "upper") return word.toUpperCase();
    if (mode === "title") return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    return word.toLowerCase();
  }

  function sanitizeCharacterSet(value, options = {}) {
    const removeWhitespace = options.removeWhitespace !== false;
    const excludeAmbiguous = Boolean(options.excludeAmbiguous);
    const seen = new Set();
    let out = "";

    for (const ch of String(value || "")) {
      if (removeWhitespace && /\s/.test(ch)) continue;
      if (excludeAmbiguous && AMBIGUOUS_PASSWORD_CHARS.has(ch)) continue;
      if (seen.has(ch)) continue;
      seen.add(ch);
      out += ch;
    }

    return out;
  }

  function randomDigits(count) {
    let out = "";
    for (let i = 0; i < count; i += 1) {
      out += randomChoiceFromString(DIGITS);
    }
    return out;
  }

  function randomChoiceFromString(str) {
    if (!str) {
      throw new Error("Cannot choose from an empty character set.");
    }
    return str.charAt(randomIndex(str.length));
  }

  function randomChoiceFromArray(arr) {
    if (!Array.isArray(arr) || arr.length === 0) {
      throw new Error("Cannot choose from an empty list.");
    }
    return arr[randomIndex(arr.length)];
  }

  function randomIndex(maxExclusive) {
    if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
      throw new Error("Random index requested with invalid range.");
    }

    if (!hasCryptoRandom || !randomBuf) {
      return Math.floor(Math.random() * maxExclusive);
    }

    const maxUint32 = 0x100000000;
    const limit = Math.floor(maxUint32 / maxExclusive) * maxExclusive;
    let value;
    do {
      globalThis.crypto.getRandomValues(randomBuf);
      value = randomBuf[0];
    } while (value >= limit);

    return value % maxExclusive;
  }

  function shuffleInPlace(arr) {
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = randomIndex(i + 1);
      const tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  function getStrength(entropyBits) {
    if (!Number.isFinite(entropyBits) || entropyBits <= 0) {
      return { label: "n/a", className: "" };
    }
    if (entropyBits < 40) return { label: "Weak", className: "strength-weak" };
    if (entropyBits < 60) return { label: "Fair", className: "strength-fair" };
    if (entropyBits < 85) return { label: "Good", className: "strength-good" };
    return { label: "Strong", className: "strength-strong" };
  }

  function log2(value) {
    return Math.log(value) / Math.log(2);
  }

  function formatBits(value) {
    if (!Number.isFinite(value)) return "0";
    const rounded = Math.round(value * 10) / 10;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
})();
