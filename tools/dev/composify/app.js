(() => {
  const STORAGE_KEYS = {
    input: "tool-composify-input",
    output: "tool-composify-output",
    wrapDockerOutput: "tool-composify-wrap-docker-output"
  };

  const DOCKER_SAMPLE = [
    "docker run -d --name api \\",
    "  --restart unless-stopped \\",
    "  -p 8080:8080 \\",
    "  -e NODE_ENV=production \\",
    "  -e LOG_LEVEL=info \\",
    "  --network app-net \\",
    "  -v ./data:/app/data \\",
    "  ghcr.io/example/api:1.3.2 \\",
    "  node server.js"
  ].join("\n");

  const COMPOSE_SAMPLE = [
    "name: composify-demo",
    "services:",
    "  web:",
    "    image: nginx:alpine",
    "    ports:",
    "      - \"8080:80\"",
    "    volumes:",
    "      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro",
    "    depends_on:",
    "      - api",
    "    networks:",
    "      - edge",
    "      - app",
    "  api:",
    "    image: ghcr.io/example/api:1.3.2",
    "    container_name: demo-api",
    "    environment:",
    "      NODE_ENV: production",
    "      LOG_LEVEL: info",
    "    ports:",
    "      - \"3000:3000\"",
    "    depends_on:",
    "      db:",
    "        condition: service_started",
    "    networks:",
    "      - app",
    "  db:",
    "    image: postgres:16-alpine",
    "    environment:",
    "      - POSTGRES_DB=demo",
    "      - POSTGRES_PASSWORD=demo",
    "    volumes:",
    "      - db-data:/var/lib/postgresql/data",
    "    networks:",
    "      - app",
    "networks:",
    "  edge: {}",
    "  app: {}",
    "volumes:",
    "  db-data: {}"
  ].join("\n");

  const refs = {
    inputEditor: document.getElementById("inputEditor"),
    outputEditor: document.getElementById("outputEditor"),
    inputStats: document.getElementById("inputStats"),
    outputStats: document.getElementById("outputStats"),
    statusBadge: document.getElementById("statusBadge"),
    statusMessage: document.getElementById("statusMessage"),
    statusMeta: document.getElementById("statusMeta"),
    warningBlock: document.getElementById("warningBlock"),
    warningList: document.getElementById("warningList"),
    diagramSvg: document.getElementById("diagramSvg"),
    diagramEmpty: document.getElementById("diagramEmpty"),
    diagramMeta: document.getElementById("diagramMeta"),
    diagramLegend: document.getElementById("diagramLegend"),
    wrapDockerOutput: document.getElementById("wrapDockerOutput"),
    autoConvertBtn: document.getElementById("autoConvertBtn"),
    dockerToComposeBtn: document.getElementById("dockerToComposeBtn"),
    composeToDockerBtn: document.getElementById("composeToDockerBtn"),
    copyOutputBtn: document.getElementById("copyOutputBtn"),
    swapEditorsBtn: document.getElementById("swapEditorsBtn"),
    clearBtn: document.getElementById("clearBtn"),
    sampleDockerBtn: document.getElementById("sampleDockerBtn"),
    sampleComposeBtn: document.getElementById("sampleComposeBtn"),
    pasteInputBtn: document.getElementById("pasteInputBtn"),
    useOutputBtn: document.getElementById("useOutputBtn"),
    selectOutputBtn: document.getElementById("selectOutputBtn"),
    downloadBtn: document.getElementById("downloadBtn")
  };

  const state = {
    lastDetected: null,
    lastOutputKind: null,
    lastModel: null
  };

  initialize();

  function initialize() {
    restoreDrafts();
    bindEvents();
    updateStats();
    setStatus("idle", "Ready.", { detected: null, outputKind: null, warnings: [] });
    renderDiagramEmpty("Convert input to render a container/network diagram.");
  }

  function bindEvents() {
    refs.autoConvertBtn.addEventListener("click", convertAuto);
    refs.dockerToComposeBtn.addEventListener("click", () => convertExplicit("docker-to-compose"));
    refs.composeToDockerBtn.addEventListener("click", () => convertExplicit("compose-to-docker"));
    refs.copyOutputBtn.addEventListener("click", copyOutput);
    refs.swapEditorsBtn.addEventListener("click", swapEditors);
    refs.clearBtn.addEventListener("click", clearEditors);
    refs.sampleDockerBtn.addEventListener("click", () => loadSample("docker"));
    refs.sampleComposeBtn.addEventListener("click", () => loadSample("compose"));
    refs.pasteInputBtn.addEventListener("click", pasteIntoInput);
    refs.useOutputBtn.addEventListener("click", useOutputAsInput);
    refs.selectOutputBtn.addEventListener("click", selectOutput);
    refs.downloadBtn.addEventListener("click", downloadOutput);

    refs.inputEditor.addEventListener("input", () => {
      persistDrafts();
      updateStats();
    });

    refs.outputEditor.addEventListener("input", () => {
      persistDrafts();
      updateStats();
    });

    refs.wrapDockerOutput.addEventListener("change", () => {
      try {
        localStorage.setItem(STORAGE_KEYS.wrapDockerOutput, String(refs.wrapDockerOutput.checked));
      } catch {
        // ignore storage failures
      }
      setStatus("idle", `Docker output wrapping ${refs.wrapDockerOutput.checked ? "enabled" : "disabled"}.`, {
        detected: state.lastDetected,
        outputKind: state.lastOutputKind,
        warnings: getVisibleWarnings()
      });
    });

    window.addEventListener("keydown", onGlobalKeydown);
  }

  function onGlobalKeydown(event) {
    const isModifier = event.metaKey || event.ctrlKey;
    if (!isModifier) return;

    const key = event.key.toLowerCase();
    if (key === "enter") {
      event.preventDefault();
      convertAuto();
      return;
    }

    if (event.shiftKey && key === "d") {
      event.preventDefault();
      convertExplicit("docker-to-compose");
      return;
    }

    if (event.shiftKey && key === "r") {
      event.preventDefault();
      convertExplicit("compose-to-docker");
    }
  }

  function restoreDrafts() {
    try {
      const savedInput = localStorage.getItem(STORAGE_KEYS.input);
      const savedOutput = localStorage.getItem(STORAGE_KEYS.output);
      const savedWrap = localStorage.getItem(STORAGE_KEYS.wrapDockerOutput);

      if (savedInput !== null) refs.inputEditor.value = savedInput;
      if (savedOutput !== null) refs.outputEditor.value = savedOutput;
      if (savedWrap !== null) refs.wrapDockerOutput.checked = savedWrap !== "false";
    } catch {
      refs.wrapDockerOutput.checked = true;
    }
  }

  function persistDrafts() {
    try {
      localStorage.setItem(STORAGE_KEYS.input, refs.inputEditor.value);
      localStorage.setItem(STORAGE_KEYS.output, refs.outputEditor.value);
    } catch {
      // ignore storage failures
    }
  }

  function updateStats() {
    refs.inputStats.textContent = formatStats(refs.inputEditor.value);
    refs.outputStats.textContent = formatStats(refs.outputEditor.value);
  }

  function formatStats(text) {
    const chars = text.length;
    const lines = text.length === 0 ? 1 : text.split(/\r?\n/).length;
    return `chars: ${chars} • lines: ${lines}`;
  }

  function loadSample(kind) {
    refs.inputEditor.value = kind === "compose" ? COMPOSE_SAMPLE : DOCKER_SAMPLE;
    persistDrafts();
    updateStats();
    refs.inputEditor.focus();
    refs.inputEditor.setSelectionRange(0, refs.inputEditor.value.length);
    setStatus("idle", `Loaded ${kind === "compose" ? "Compose YAML" : "docker run"} sample.`, {
      detected: kind === "compose" ? "compose yaml" : "docker run",
      outputKind: state.lastOutputKind,
      warnings: []
    });
  }

  async function pasteIntoInput() {
    try {
      if (!navigator.clipboard?.readText) {
        setStatus("warn", "Clipboard API not available. Paste manually.");
        refs.inputEditor.focus();
        return;
      }
      refs.inputEditor.value = await navigator.clipboard.readText();
      persistDrafts();
      updateStats();
      setStatus("idle", "Clipboard pasted into input.");
      refs.inputEditor.focus();
    } catch {
      setStatus("warn", "Clipboard read blocked. Use Ctrl/Cmd+V.");
      refs.inputEditor.focus();
    }
  }

  function useOutputAsInput() {
    if (!refs.outputEditor.value.trim()) {
      setStatus("warn", "Output is empty.");
      return;
    }
    refs.inputEditor.value = refs.outputEditor.value;
    persistDrafts();
    updateStats();
    setStatus("idle", "Output copied into input.", {
      detected: state.lastOutputKind === "compose-yaml" ? "compose yaml" : state.lastOutputKind === "docker-run" ? "docker run" : state.lastDetected,
      outputKind: state.lastOutputKind,
      warnings: []
    });
    refs.inputEditor.focus();
  }

  function selectOutput() {
    refs.outputEditor.focus();
    refs.outputEditor.select();
    setStatus("idle", "Output selected.", {
      detected: state.lastDetected,
      outputKind: state.lastOutputKind,
      warnings: getVisibleWarnings()
    });
  }

  async function copyOutput() {
    const text = refs.outputEditor.value;
    if (!text.trim()) {
      setStatus("warn", "Output is empty.");
      return;
    }
    try {
      await copyText(text);
      flashButton(refs.copyOutputBtn);
      setStatus("ok", "Output copied.", {
        detected: state.lastDetected,
        outputKind: state.lastOutputKind,
        warnings: getVisibleWarnings()
      });
    } catch {
      setStatus("error", "Copy failed. Select output and copy manually.");
    }
  }

  function downloadOutput() {
    const text = refs.outputEditor.value;
    if (!text.trim()) {
      setStatus("warn", "Output is empty.");
      return;
    }

    const ext = state.lastOutputKind === "compose-yaml" ? "yaml" : state.lastOutputKind === "docker-run" ? "sh" : "txt";
    const basename = state.lastOutputKind === "compose-yaml" ? "compose" : state.lastOutputKind === "docker-run" ? "docker-run" : "composify-output";
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${basename}.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setStatus("ok", `Downloaded ${basename}.${ext}.`, {
      detected: state.lastDetected,
      outputKind: state.lastOutputKind,
      warnings: getVisibleWarnings()
    });
  }

  function swapEditors() {
    const input = refs.inputEditor.value;
    refs.inputEditor.value = refs.outputEditor.value;
    refs.outputEditor.value = input;
    persistDrafts();
    updateStats();
    setStatus("idle", "Swapped input and output editors.", {
      detected: state.lastDetected,
      outputKind: state.lastOutputKind,
      warnings: []
    });
    refs.inputEditor.focus();
  }

  function clearEditors() {
    refs.inputEditor.value = "";
    refs.outputEditor.value = "";
    persistDrafts();
    updateStats();
    state.lastDetected = null;
    state.lastOutputKind = null;
    state.lastModel = null;
    setStatus("idle", "Cleared input and output.", { detected: null, outputKind: null, warnings: [] });
    renderDiagramEmpty("Convert input to render a container/network diagram.");
    refs.inputEditor.focus();
  }

  function convertAuto() {
    const input = refs.inputEditor.value;
    if (!input.trim()) {
      setStatus("warn", "Input is empty.");
      renderDiagramEmpty("Paste docker run commands or Compose YAML to render a diagram.");
      return;
    }

    const detected = detectInputKind(input);
    if (detected === "docker") {
      const result = runDockerToCompose(input);
      applyConversionResult(result);
      return;
    }
    if (detected === "compose") {
      const result = runComposeToDocker(input);
      applyConversionResult(result);
      return;
    }

    const dockerAttempt = runDockerToCompose(input, { suppressThrow: true });
    if (dockerAttempt.ok) {
      applyConversionResult(dockerAttempt);
      return;
    }

    const composeAttempt = runComposeToDocker(input, { suppressThrow: true });
    if (composeAttempt.ok) {
      applyConversionResult(composeAttempt);
      return;
    }

    const errMsg = [
      "Could not detect a supported docker run command or Compose YAML file.",
      dockerAttempt.error ? `docker parse: ${dockerAttempt.error.message}` : null,
      composeAttempt.error ? `compose parse: ${composeAttempt.error.message}` : null
    ]
      .filter(Boolean)
      .join(" ");

    setStatus("error", errMsg, { detected: "unknown", outputKind: state.lastOutputKind, warnings: [] });
    renderDiagramEmpty("Parsing failed. Fix the input and convert again.");
  }

  function convertExplicit(direction) {
    const input = refs.inputEditor.value;
    if (!input.trim()) {
      setStatus("warn", "Input is empty.");
      renderDiagramEmpty("Paste docker run commands or Compose YAML to render a diagram.");
      return;
    }

    const result = direction === "docker-to-compose" ? runDockerToCompose(input, { suppressThrow: true }) : runComposeToDocker(input, { suppressThrow: true });
    applyConversionResult(result);
  }

  function applyConversionResult(result) {
    if (!result.ok) {
      setStatus("error", result.error.message, { detected: result.detected || state.lastDetected, outputKind: state.lastOutputKind, warnings: [] });
      renderDiagramEmpty("Parsing failed. Fix the input and convert again.");
      return;
    }

    refs.outputEditor.value = result.output;
    persistDrafts();
    updateStats();

    state.lastModel = result.model;
    state.lastDetected = result.detected;
    state.lastOutputKind = result.outputKind;

    const serviceCount = result.model.services.length;
    const noun = serviceCount === 1 ? "service" : "services";
    setStatus("ok", `Converted ${serviceCount} ${noun} (${result.directionLabel}).`, {
      detected: result.detected,
      outputKind: result.outputKind,
      warnings: result.warnings
    });
    renderDiagram(result.model);
    focusOutputAfterConvert();
  }

  function focusOutputAfterConvert() {
    refs.outputEditor.focus();
    refs.outputEditor.setSelectionRange(0, 0);
  }

  function runDockerToCompose(input, options = {}) {
    try {
      const parsed = parseDockerRunInput(input);
      const output = emitComposeYaml(parsed.model);
      return {
        ok: true,
        detected: "docker run",
        outputKind: "compose-yaml",
        directionLabel: "Docker → Compose YAML",
        model: parsed.model,
        output,
        warnings: parsed.warnings
      };
    } catch (error) {
      if (!options.suppressThrow) throw error;
      return { ok: false, detected: "docker run", error: normalizeError(error) };
    }
  }

  function runComposeToDocker(input, options = {}) {
    try {
      const parsed = parseComposeInput(input);
      const emitted = emitDockerRunCommands(parsed.model, { wrap: refs.wrapDockerOutput.checked });
      return {
        ok: true,
        detected: "compose yaml",
        outputKind: "docker-run",
        directionLabel: "Compose YAML → docker run",
        model: parsed.model,
        output: emitted.text,
        warnings: dedupeStrings(parsed.warnings.concat(emitted.warnings))
      };
    } catch (error) {
      if (!options.suppressThrow) throw error;
      return { ok: false, detected: "compose yaml", error: normalizeError(error) };
    }
  }

  function detectInputKind(text) {
    const trimmed = text.trim();
    if (!trimmed) return "unknown";

    if (/^\s*services\s*:/m.test(trimmed)) return "compose";
    if (/^\s*(version|name)\s*:/m.test(trimmed) && /^\s*services\s*:/m.test(trimmed)) return "compose";
    if (/\bdocker\s+(?:container\s+)?run\b/.test(trimmed)) return "docker";
    return "unknown";
  }

  function parseDockerRunInput(text) {
    const commandLines = splitDockerCommands(text);
    if (!commandLines.length) {
      throw new Error("No docker run commands found. Paste one or more docker run lines.");
    }

    const services = [];
    const warnings = [];
    const keyUsage = new Map();

    for (let index = 0; index < commandLines.length; index += 1) {
      const parsed = parseDockerRunCommand(commandLines[index], index);
      parsed.service.key = ensureUniqueServiceKey(parsed.service.key, keyUsage);
      services.push(parsed.service);
      warnings.push(...parsed.warnings);
    }

    const networkNames = new Set();
    services.forEach((service) => {
      service.networks.forEach((name) => networkNames.add(name));
    });

    return {
      model: {
        name: "",
        services,
        networks: Array.from(networkNames)
      },
      warnings: dedupeStrings(warnings)
    };
  }

  function splitDockerCommands(text) {
    const lines = text.replace(/\r/g, "").split("\n");
    const commands = [];
    let current = "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        if (current.trim()) {
          commands.push(current.trim());
          current = "";
        }
        continue;
      }

      if (!current && trimmed.startsWith("#")) continue;

      const lineNoTrailing = line.replace(/\s+$/, "");
      const continued = /(^|[^\\])\\$/.test(lineNoTrailing);
      const content = continued ? lineNoTrailing.slice(0, -1) : line;
      current += `${content} `;

      if (!continued) {
        commands.push(current.trim());
        current = "";
      }
    }

    if (current.trim()) commands.push(current.trim());
    return commands.filter((value) => value.trim().length > 0);
  }

  function parseDockerRunCommand(commandText, commandIndex) {
    const tokens = tokenizeShell(commandText);
    if (!tokens.length) {
      throw new Error(`Line ${commandIndex + 1}: empty command.`);
    }

    const warnings = [];
    const service = createEmptyService(`service-${commandIndex + 1}`);

    let i = 0;
    while (i < tokens.length && isEnvAssignmentToken(tokens[i])) {
      warnings.push(`Ignored shell env prefix before docker run: ${tokens[i]}`);
      i += 1;
    }

    if (tokens[i] === "sudo") i += 1;
    if (tokens[i] !== "docker") {
      throw new Error(`Command ${commandIndex + 1}: expected 'docker', found '${tokens[i] || "<end>"}'.`);
    }
    i += 1;

    if (tokens[i] === "container") i += 1;

    if (tokens[i] !== "run") {
      if (tokens[i] === "compose" || tokens[i] === "docker-compose") {
        throw new Error("Compose CLI commands are not supported as input. Paste a Compose YAML file instead.");
      }
      throw new Error(`Command ${commandIndex + 1}: expected 'run' after docker, found '${tokens[i] || "<end>"}'.`);
    }
    i += 1;

    while (i < tokens.length) {
      const token = tokens[i];

      if (token === "--") {
        i += 1;
        break;
      }

      if (!service.image && token.startsWith("-")) {
        i = consumeDockerRunOption(tokens, i, service, warnings);
        continue;
      }

      service.image = token;
      i += 1;
      break;
    }

    if (!service.image) {
      throw new Error(`Command ${commandIndex + 1}: docker run image was not found.`);
    }

    if (i < tokens.length) {
      service.command = tokens.slice(i);
    }

    service.key = sanitizeServiceKey(service.containerName || inferServiceNameFromImage(service.image) || `service-${commandIndex + 1}`);
    return { service, warnings };
  }

  function createEmptyService(fallbackKey) {
    return {
      key: fallbackKey,
      image: "",
      buildHint: "",
      containerName: "",
      command: null,
      entrypoint: null,
      environment: [],
      envFiles: [],
      ports: [],
      volumes: [],
      networks: [],
      networkMode: "",
      dependsOn: [],
      labels: [],
      restart: "",
      hostname: "",
      user: "",
      workingDir: "",
      platform: "",
      pullPolicy: "",
      stdinOpen: false,
      tty: false,
      init: false
    };
  }

  function consumeDockerRunOption(tokens, index, service, warnings) {
    const token = tokens[index];

    if (token.startsWith("--")) {
      const { name, value, hasInlineValue } = splitLongOption(token);
      const consumeValue = () => {
        if (hasInlineValue) return value;
        const next = tokens[index + 1];
        if (next == null) {
          throw new Error(`Option --${name} is missing a value.`);
        }
        index += 1;
        return next;
      };

      switch (name) {
        case "detach":
          warnings.push("docker run -d/--detach has no Compose service equivalent (runtime option).");
          break;
        case "rm":
          warnings.push("docker run --rm has no Compose service equivalent (runtime option).");
          break;
        case "name":
          service.containerName = consumeValue();
          break;
        case "publish":
        case "p":
          service.ports.push(consumeValue());
          break;
        case "env":
        case "environment":
          pushEnv(service.environment, consumeValue());
          break;
        case "env-file":
          service.envFiles.push(consumeValue());
          break;
        case "volume":
          service.volumes.push(consumeValue());
          break;
        case "mount": {
          const mountValue = consumeValue();
          const converted = mountSpecToVolumeShort(mountValue);
          if (converted) {
            service.volumes.push(converted);
          } else {
            warnings.push(`Could not convert --mount '${mountValue}' to Compose short volume syntax.`);
          }
          break;
        }
        case "network":
        case "net": {
          const network = consumeValue();
          if (isSpecialNetworkMode(network)) {
            service.networkMode = network;
          } else if (!service.networks.includes(network)) {
            service.networks.push(network);
          }
          break;
        }
        case "restart":
          service.restart = consumeValue();
          break;
        case "hostname":
          service.hostname = consumeValue();
          break;
        case "workdir":
          service.workingDir = consumeValue();
          break;
        case "user":
          service.user = consumeValue();
          break;
        case "entrypoint":
          service.entrypoint = [consumeValue()];
          break;
        case "label":
          pushLabel(service.labels, consumeValue());
          break;
        case "tty":
          service.tty = true;
          break;
        case "interactive":
          service.stdinOpen = true;
          break;
        case "init":
          service.init = true;
          break;
        case "platform":
          service.platform = consumeValue();
          break;
        case "pull":
          service.pullPolicy = consumeValue();
          break;
        case "publish-all":
          warnings.push("docker run -P/--publish-all cannot be represented exactly in Compose YAML.");
          break;
        default:
          if (name.startsWith("name=") || name.startsWith("publish=")) {
            // unreachable with splitLongOption, but kept defensive
            break;
          }
          warnings.push(`Unsupported docker run option ignored: --${name}${hasInlineValue ? `=${value}` : ""}`);
      }

      return index + 1;
    }

    if (/^-[^-]/.test(token)) {
      return consumeShortOptionCluster(tokens, index, service, warnings);
    }

    return index + 1;
  }

  function consumeShortOptionCluster(tokens, index, service, warnings) {
    const chars = tokens[index].slice(1);
    let pos = 0;

    while (pos < chars.length) {
      const flag = chars[pos];

      if (flag === "d") {
        warnings.push("docker run -d has no Compose service equivalent (runtime option).");
        pos += 1;
        continue;
      }
      if (flag === "i") {
        service.stdinOpen = true;
        pos += 1;
        continue;
      }
      if (flag === "t") {
        service.tty = true;
        pos += 1;
        continue;
      }
      if (flag === "P") {
        warnings.push("docker run -P cannot be represented exactly in Compose YAML.");
        pos += 1;
        continue;
      }

      if (["p", "e", "v", "w", "u", "h", "l"].includes(flag)) {
        let value = chars.slice(pos + 1);
        if (!value) {
          if (tokens[index + 1] == null) {
            throw new Error(`Option -${flag} is missing a value.`);
          }
          index += 1;
          value = tokens[index];
        }
        applyShortOptionValue(flag, value, service, warnings);
        return index + 1;
      }

      warnings.push(`Unsupported short docker run option ignored: -${flag}`);
      pos += 1;
    }

    return index + 1;
  }

  function applyShortOptionValue(flag, value, service, warnings) {
    switch (flag) {
      case "p":
        service.ports.push(value);
        break;
      case "e":
        pushEnv(service.environment, value);
        break;
      case "v":
        service.volumes.push(value);
        break;
      case "w":
        service.workingDir = value;
        break;
      case "u":
        service.user = value;
        break;
      case "h":
        service.hostname = value;
        break;
      case "l":
        pushLabel(service.labels, value);
        break;
      default:
        warnings.push(`Unsupported short docker run option ignored: -${flag} ${value}`);
    }
  }

  function splitLongOption(token) {
    const eqIndex = token.indexOf("=");
    if (eqIndex === -1) {
      return { name: token.slice(2), value: "", hasInlineValue: false };
    }
    return {
      name: token.slice(2, eqIndex),
      value: token.slice(eqIndex + 1),
      hasInlineValue: true
    };
  }

  function pushEnv(target, value) {
    const index = value.indexOf("=");
    if (index === -1) {
      target.push({ key: value, value: null });
      return;
    }
    target.push({ key: value.slice(0, index), value: value.slice(index + 1) });
  }

  function pushLabel(target, value) {
    target.push(value);
  }

  function mountSpecToVolumeShort(spec) {
    const parts = splitOnUnescapedComma(spec).map((part) => part.trim()).filter(Boolean);
    if (!parts.length) return "";

    const map = {};
    for (const part of parts) {
      const eq = part.indexOf("=");
      if (eq === -1) {
        map[part] = true;
        continue;
      }
      const key = part.slice(0, eq).trim();
      const value = part.slice(eq + 1).trim();
      map[key] = value;
    }

    const type = String(map.type || "volume");
    const source = map.source || map.src;
    const target = map.target || map.dst || map.destination;
    const readOnly = Boolean(map.readonly || map.ro);

    if (!target) return "";
    if (!["bind", "volume"].includes(type)) return "";

    let out = source ? `${source}:${target}` : `${target}`;
    if (readOnly) out += ":ro";
    return out;
  }

  function splitOnUnescapedComma(input) {
    const parts = [];
    let current = "";
    let escaped = false;
    for (let i = 0; i < input.length; i += 1) {
      const ch = input[i];
      if (escaped) {
        current += ch;
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        current += ch;
        escaped = true;
        continue;
      }
      if (ch === ",") {
        parts.push(current);
        current = "";
        continue;
      }
      current += ch;
    }
    parts.push(current);
    return parts;
  }

  function tokenizeShell(text) {
    const tokens = [];
    let current = "";
    let quote = null;
    let escaping = false;

    for (let i = 0; i < text.length; i += 1) {
      const ch = text[i];

      if (quote === "'") {
        if (ch === "'") {
          quote = null;
        } else {
          current += ch;
        }
        continue;
      }

      if (quote === "\"") {
        if (escaping) {
          current += ch;
          escaping = false;
          continue;
        }
        if (ch === "\\") {
          escaping = true;
          continue;
        }
        if (ch === "\"") {
          quote = null;
          continue;
        }
        current += ch;
        continue;
      }

      if (escaping) {
        current += ch;
        escaping = false;
        continue;
      }

      if (ch === "\\") {
        escaping = true;
        continue;
      }

      if (ch === "'" || ch === "\"") {
        quote = ch;
        continue;
      }

      if (/\s/.test(ch)) {
        if (current) {
          tokens.push(current);
          current = "";
        }
        continue;
      }

      current += ch;
    }

    if (quote) {
      throw new Error("Unclosed quote in docker command.");
    }
    if (escaping) {
      current += "\\";
    }
    if (current) {
      tokens.push(current);
    }
    return tokens;
  }

  function emitComposeYaml(model) {
    const lines = [];

    if (model.name) {
      lines.push(`name: ${yamlScalar(model.name)}`);
    }
    lines.push("services:");

    for (const service of model.services) {
      lines.push(`  ${yamlKey(service.key)}:`);
      emitYamlService(lines, service, "    ");
    }

    const declaredNetworks = collectDeclaredNetworks(model);
    if (declaredNetworks.length) {
      lines.push("networks:");
      declaredNetworks.forEach((networkName) => {
        lines.push(`  ${yamlKey(networkName)}: {}`);
      });
    }

    return `${lines.join("\n")}\n`;
  }

  function emitYamlService(lines, service, indent) {
    if (service.image) lines.push(`${indent}image: ${yamlScalar(service.image)}`);
    if (service.containerName) lines.push(`${indent}container_name: ${yamlScalar(service.containerName)}`);
    if (service.hostname) lines.push(`${indent}hostname: ${yamlScalar(service.hostname)}`);
    if (service.user) lines.push(`${indent}user: ${yamlScalar(service.user)}`);
    if (service.workingDir) lines.push(`${indent}working_dir: ${yamlScalar(service.workingDir)}`);
    if (service.platform) lines.push(`${indent}platform: ${yamlScalar(service.platform)}`);
    if (service.pullPolicy) lines.push(`${indent}pull_policy: ${yamlScalar(service.pullPolicy)}`);
    if (service.restart) lines.push(`${indent}restart: ${yamlScalar(service.restart)}`);
    if (service.networkMode) lines.push(`${indent}network_mode: ${yamlScalar(service.networkMode)}`);
    if (service.stdinOpen) lines.push(`${indent}stdin_open: true`);
    if (service.tty) lines.push(`${indent}tty: true`);
    if (service.init) lines.push(`${indent}init: true`);

    emitYamlCommandField(lines, "entrypoint", service.entrypoint, indent);
    emitYamlCommandField(lines, "command", service.command, indent);

    emitYamlStringList(lines, "ports", service.ports, indent);
    emitYamlEnvironment(lines, service.environment, indent);
    emitYamlStringList(lines, "env_file", service.envFiles, indent);
    emitYamlStringList(lines, "volumes", service.volumes, indent);
    emitYamlStringList(lines, "labels", service.labels, indent);
    emitYamlStringList(lines, "depends_on", service.dependsOn, indent);
    emitYamlStringList(lines, "networks", service.networks, indent);
  }

  function emitYamlCommandField(lines, key, value, indent) {
    if (value == null) return;

    if (Array.isArray(value)) {
      if (!value.length) return;
      lines.push(`${indent}${key}:`);
      value.forEach((item) => {
        lines.push(`${indent}  - ${yamlScalar(String(item))}`);
      });
      return;
    }

    lines.push(`${indent}${key}: ${yamlScalar(String(value))}`);
  }

  function emitYamlEnvironment(lines, envList, indent) {
    if (!envList.length) return;
    lines.push(`${indent}environment:`);
    envList.forEach((entry) => {
      const value = entry.value == null ? entry.key : `${entry.key}=${entry.value}`;
      lines.push(`${indent}  - ${yamlScalar(value)}`);
    });
  }

  function emitYamlStringList(lines, key, values, indent) {
    if (!values || !values.length) return;
    lines.push(`${indent}${key}:`);
    values.forEach((value) => {
      lines.push(`${indent}  - ${yamlScalar(String(value))}`);
    });
  }

  function collectDeclaredNetworks(model) {
    const out = new Set();
    if (Array.isArray(model.networks)) {
      model.networks.forEach((name) => {
        if (name && !isImplicitDefaultNetwork(name)) out.add(name);
      });
    }
    model.services.forEach((service) => {
      if (!service.networkMode) {
        service.networks.forEach((name) => {
          if (name && !isImplicitDefaultNetwork(name)) out.add(name);
        });
      }
    });
    return Array.from(out);
  }

  function yamlKey(value) {
    if (/^[A-Za-z0-9._-]+$/.test(value)) return value;
    return yamlScalar(value);
  }

  function yamlScalar(value) {
    const stringValue = String(value);
    if (stringValue === "") return "\"\"";

    const lower = stringValue.toLowerCase();
    const ambiguous = new Set(["null", "~", "true", "false", "yes", "no", "on", "off"]);
    const needsQuote =
      ambiguous.has(lower) ||
      /^[-?:,[\]{}#&*!|>'"%@`]/.test(stringValue) ||
      /\s/.test(stringValue) ||
      /[:#]/.test(stringValue) ||
      /^[-+]?\d+(?:\.\d+)?$/.test(stringValue);

    if (!needsQuote && /^[A-Za-z0-9._/@-]+$/.test(stringValue)) {
      return stringValue;
    }

    return `'${stringValue.replace(/'/g, "''")}'`;
  }

  function parseComposeInput(text) {
    const raw = parseYamlSubset(text);
    return normalizeComposeModel(raw);
  }

  function normalizeComposeModel(raw) {
    if (!isPlainObject(raw)) {
      throw new Error("Compose input must be a YAML mapping with a top-level services block.");
    }
    if (!isPlainObject(raw.services)) {
      throw new Error("Compose YAML must contain a top-level 'services:' mapping.");
    }

    const warnings = [];
    const services = [];
    const explicitNetworks = isPlainObject(raw.networks) ? Object.keys(raw.networks) : [];

    for (const [serviceKey, spec] of Object.entries(raw.services)) {
      if (!isPlainObject(spec)) {
        warnings.push(`Service '${serviceKey}' is not a mapping and was skipped.`);
        continue;
      }

      warnUnsupportedComposeKeys(serviceKey, spec, warnings);

      const service = createEmptyService(sanitizeServiceKey(serviceKey || "service"));
      service.key = sanitizeServiceKey(serviceKey || "service");
      service.image = toOptionalString(spec.image);
      if (!service.image && spec.build != null) {
        service.buildHint = typeof spec.build === "string" ? spec.build : "[build]";
        warnings.push(`Service '${serviceKey}' uses build config; docker run output requires an image and may be incomplete.`);
      }
      service.containerName = toOptionalString(spec.container_name);
      service.hostname = toOptionalString(spec.hostname);
      service.user = toOptionalString(spec.user);
      service.workingDir = toOptionalString(spec.working_dir);
      service.platform = toOptionalString(spec.platform);
      service.pullPolicy = toOptionalString(spec.pull_policy);
      service.restart = toOptionalString(spec.restart);
      service.networkMode = toOptionalString(spec.network_mode);
      service.stdinOpen = toBoolean(spec.stdin_open);
      service.tty = toBoolean(spec.tty);
      service.init = toBoolean(spec.init);
      service.command = normalizeCommandField(spec.command, serviceKey, "command", warnings);
      service.entrypoint = normalizeCommandField(spec.entrypoint, serviceKey, "entrypoint", warnings);
      service.environment = normalizeEnvironmentField(spec.environment, serviceKey, warnings);
      service.envFiles = normalizeStringListField(spec.env_file, serviceKey, "env_file", warnings);
      service.ports = normalizePortsField(spec.ports, serviceKey, warnings);
      service.volumes = normalizeVolumesField(spec.volumes, serviceKey, warnings);
      service.labels = normalizeLabelsField(spec.labels, serviceKey, warnings);
      service.dependsOn = normalizeDependsOnField(spec.depends_on, serviceKey, warnings);
      service.networks = normalizeNetworksField(spec.networks, serviceKey, warnings);

      services.push(service);
    }

    if (!services.length) {
      throw new Error("No valid services found in Compose YAML.");
    }

    const dedupedServices = dedupeServiceKeysInPlace(services, warnings);

    return {
      model: {
        name: toOptionalString(raw.name),
        services: dedupedServices,
        networks: explicitNetworks
      },
      warnings: dedupeStrings(warnings)
    };
  }

  function warnUnsupportedComposeKeys(serviceKey, spec, warnings) {
    const supported = new Set([
      "image",
      "build",
      "container_name",
      "command",
      "entrypoint",
      "ports",
      "environment",
      "env_file",
      "volumes",
      "networks",
      "network_mode",
      "depends_on",
      "restart",
      "hostname",
      "user",
      "working_dir",
      "labels",
      "tty",
      "stdin_open",
      "init",
      "platform",
      "pull_policy"
    ]);

    Object.keys(spec).forEach((key) => {
      if (!supported.has(key)) {
        warnings.push(`Service '${serviceKey}': unsupported field '${key}' ignored in docker run conversion.`);
      }
    });
  }

  function normalizeCommandField(value, serviceKey, field, warnings) {
    if (value == null) return null;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }
    if (Array.isArray(value)) {
      return value.map((part) => String(part));
    }
    warnings.push(`Service '${serviceKey}': unsupported ${field} format ignored.`);
    return null;
  }

  function normalizeEnvironmentField(value, serviceKey, warnings) {
    if (value == null) return [];

    if (Array.isArray(value)) {
      const out = [];
      value.forEach((item) => {
        if (item == null) return;
        if (typeof item === "string" || typeof item === "number" || typeof item === "boolean") {
          pushEnv(out, String(item));
          return;
        }
        warnings.push(`Service '${serviceKey}': unsupported environment list item ignored.`);
      });
      return out;
    }

    if (isPlainObject(value)) {
      return Object.entries(value).map(([key, envValue]) => ({
        key: String(key),
        value: envValue == null ? null : String(envValue)
      }));
    }

    warnings.push(`Service '${serviceKey}': unsupported environment format ignored.`);
    return [];
  }

  function normalizeStringListField(value, serviceKey, field, warnings) {
    if (value == null) return [];
    if (Array.isArray(value)) {
      return value
        .filter((item) => item != null)
        .map((item) => (isPlainObject(item) ? (warnings.push(`Service '${serviceKey}': unsupported object in ${field} ignored.`), null) : String(item)))
        .filter(Boolean);
    }
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      return [String(value)];
    }
    warnings.push(`Service '${serviceKey}': unsupported ${field} format ignored.`);
    return [];
  }

  function normalizePortsField(value, serviceKey, warnings) {
    if (value == null) return [];
    if (!Array.isArray(value)) {
      warnings.push(`Service '${serviceKey}': ports should be a list.`);
      return [];
    }

    const out = [];
    value.forEach((item) => {
      if (item == null) return;
      if (typeof item === "string" || typeof item === "number") {
        out.push(String(item));
        return;
      }
      if (!isPlainObject(item)) {
        warnings.push(`Service '${serviceKey}': unsupported port item ignored.`);
        return;
      }
      const target = item.target != null ? String(item.target) : "";
      const published = item.published != null ? String(item.published) : "";
      const hostIp = item.host_ip != null ? String(item.host_ip) : "";
      const protocol = item.protocol != null ? String(item.protocol) : "";
      if (!target) {
        warnings.push(`Service '${serviceKey}': long-syntax port item missing target.`);
        return;
      }
      let portString = "";
      if (hostIp && published) portString += `${hostIp}:`;
      if (published) portString += `${published}:`;
      portString += target;
      if (protocol && protocol !== "tcp") portString += `/${protocol}`;
      out.push(portString);
    });
    return out;
  }

  function normalizeVolumesField(value, serviceKey, warnings) {
    if (value == null) return [];
    if (!Array.isArray(value)) {
      warnings.push(`Service '${serviceKey}': volumes should be a list.`);
      return [];
    }

    const out = [];
    value.forEach((item) => {
      if (item == null) return;
      if (typeof item === "string" || typeof item === "number") {
        out.push(String(item));
        return;
      }
      if (!isPlainObject(item)) {
        warnings.push(`Service '${serviceKey}': unsupported volume item ignored.`);
        return;
      }
      const type = item.type != null ? String(item.type) : "";
      if (type && type === "tmpfs") {
        warnings.push(`Service '${serviceKey}': tmpfs volume cannot be emitted as docker -v and was ignored.`);
        return;
      }
      const source = item.source != null ? String(item.source) : "";
      const target = item.target != null ? String(item.target) : "";
      const readOnly = Boolean(item.read_only);
      if (!target) {
        warnings.push(`Service '${serviceKey}': long-syntax volume item missing target.`);
        return;
      }
      let volumeString = source ? `${source}:${target}` : `${target}`;
      if (readOnly) volumeString += ":ro";
      out.push(volumeString);
    });
    return out;
  }

  function normalizeLabelsField(value, serviceKey, warnings) {
    if (value == null) return [];
    if (Array.isArray(value)) {
      return value
        .map((item) => (item == null ? null : isPlainObject(item) ? null : String(item)))
        .filter((item) => {
          if (item == null) {
            warnings.push(`Service '${serviceKey}': unsupported label item ignored.`);
            return false;
          }
          return true;
        });
    }
    if (isPlainObject(value)) {
      return Object.entries(value).map(([key, labelValue]) => `${key}=${labelValue == null ? "" : String(labelValue)}`);
    }
    if (typeof value === "string") return [value];
    warnings.push(`Service '${serviceKey}': unsupported labels format ignored.`);
    return [];
  }

  function normalizeDependsOnField(value, serviceKey, warnings) {
    if (value == null) return [];
    if (Array.isArray(value)) {
      return value.map((item) => String(item));
    }
    if (isPlainObject(value)) {
      return Object.keys(value).map((item) => String(item));
    }
    if (typeof value === "string") return [value];
    warnings.push(`Service '${serviceKey}': unsupported depends_on format ignored.`);
    return [];
  }

  function normalizeNetworksField(value, serviceKey, warnings) {
    if (value == null) return [];
    if (Array.isArray(value)) {
      return value
        .map((item) => {
          if (isPlainObject(item)) {
            const keys = Object.keys(item);
            if (!keys.length) return null;
            return String(keys[0]);
          }
          return String(item);
        })
        .filter(Boolean);
    }
    if (isPlainObject(value)) {
      return Object.keys(value).map((key) => String(key));
    }
    if (typeof value === "string") return [value];
    warnings.push(`Service '${serviceKey}': unsupported networks format ignored.`);
    return [];
  }

  function emitDockerRunCommands(model, options) {
    const warnings = [];
    const serviceOutputs = [];
    const multiple = model.services.length > 1;

    model.services.forEach((service) => {
      const built = buildDockerRunSegments(service, warnings);
      if (!built) return;
      const block = formatDockerRunSegments(built, { wrap: Boolean(options.wrap), includeHeader: multiple, header: service.key });
      serviceOutputs.push(block);
    });

    if (!serviceOutputs.length) {
      throw new Error("No services could be converted to docker run commands.");
    }

    return {
      text: serviceOutputs.join("\n\n"),
      warnings: dedupeStrings(warnings)
    };
  }

  function buildDockerRunSegments(service, warnings) {
    if (!service.image) {
      warnings.push(`Service '${service.key}' skipped: docker run output requires an image.`);
      return null;
    }

    const segments = ["docker run"];
    const commandSegments = [];

    if (service.containerName) segments.push(`--name ${shellQuote(service.containerName)}`);
    if (service.hostname) segments.push(`--hostname ${shellQuote(service.hostname)}`);
    if (service.user) segments.push(`--user ${shellQuote(service.user)}`);
    if (service.workingDir) segments.push(`--workdir ${shellQuote(service.workingDir)}`);
    if (service.platform) segments.push(`--platform ${shellQuote(service.platform)}`);
    if (service.pullPolicy) segments.push(`--pull ${shellQuote(service.pullPolicy)}`);
    if (service.restart) segments.push(`--restart ${shellQuote(service.restart)}`);
    if (service.init) segments.push("--init");
    if (service.stdinOpen) segments.push("-i");
    if (service.tty) segments.push("-t");

    if (service.networkMode) {
      segments.push(`--network ${shellQuote(service.networkMode)}`);
    } else if (service.networks.length > 1) {
      segments.push(`--network ${shellQuote(service.networks[0])}`);
      warnings.push(`Service '${service.key}': docker run supports one network at start. Used '${service.networks[0]}' and ignored ${service.networks.length - 1} additional network(s).`);
    } else if (service.networks.length === 1 && !isImplicitDefaultNetwork(service.networks[0])) {
      segments.push(`--network ${shellQuote(service.networks[0])}`);
    }

    service.ports.forEach((port) => segments.push(`-p ${shellQuote(String(port))}`));
    service.environment.forEach((entry) => {
      const envString = entry.value == null ? entry.key : `${entry.key}=${entry.value}`;
      segments.push(`-e ${shellQuote(envString)}`);
    });
    service.envFiles.forEach((envFile) => segments.push(`--env-file ${shellQuote(String(envFile))}`));
    service.volumes.forEach((volume) => segments.push(`-v ${shellQuote(String(volume))}`));
    service.labels.forEach((label) => segments.push(`--label ${shellQuote(String(label))}`));

    if (service.dependsOn.length) {
      warnings.push(`Service '${service.key}': depends_on has no direct docker run equivalent.`);
    }

    if (Array.isArray(service.entrypoint)) {
      if (service.entrypoint.length === 1) {
        segments.push(`--entrypoint ${shellQuote(service.entrypoint[0])}`);
      } else if (service.entrypoint.length > 1) {
        segments.push(`--entrypoint ${shellQuote(service.entrypoint[0])}`);
        commandSegments.push(...service.entrypoint.slice(1).map((item) => shellQuote(String(item))));
        warnings.push(`Service '${service.key}': entrypoint array with multiple items was split into --entrypoint plus command args.`);
      }
    } else if (typeof service.entrypoint === "string" && service.entrypoint) {
      segments.push(`--entrypoint ${shellQuote(service.entrypoint)}`);
    }

    segments.push(shellQuote(service.image));

    if (Array.isArray(service.command)) {
      service.command.forEach((part) => commandSegments.push(shellQuote(String(part))));
    } else if (typeof service.command === "string" && service.command.length) {
      commandSegments.push(shellQuote(service.command));
      warnings.push(`Service '${service.key}': string-form command preserved as one argument; shell-form semantics may differ.`);
    }

    segments.push(...commandSegments);
    return segments;
  }

  function formatDockerRunSegments(segments, options) {
    const { wrap, includeHeader, header } = options;
    const body = wrap && segments.length > 2 ? `${segments[0]} \\\n  ${segments.slice(1).join(" \\\n  ")}` : segments.join(" ");
    return includeHeader ? `# ${header}\n${body}` : body;
  }

  function shellQuote(value) {
    const text = String(value);
    if (text === "") return "''";
    if (/^[A-Za-z0-9_./:@%+=,-]+$/.test(text)) return text;
    return `'${text.replace(/'/g, "'\"'\"'")}'`;
  }

  function parseYamlSubset(text) {
    const lines = prepareYamlLines(text);
    const first = skipYamlBlanks(lines, 0);
    if (first >= lines.length) {
      throw new Error("Compose YAML input is empty.");
    }

    const parsed = parseYamlNode(lines, first, lines[first].indent);
    const tail = skipYamlBlanks(lines, parsed.nextIndex);
    if (tail < lines.length) {
      throw new Error(`YAML parse error at line ${lines[tail].lineNo}: unexpected trailing content.`);
    }
    return parsed.value;
  }

  function prepareYamlLines(text) {
    const rawLines = text.replace(/\r/g, "").split("\n");
    return rawLines.map((raw, index) => {
      if (/^\t+/.test(raw)) {
        throw new Error(`YAML parse error at line ${index + 1}: tabs are not supported for indentation.`);
      }
      const withoutComment = stripYamlComment(raw);
      if (!withoutComment.trim()) {
        return { blank: true, lineNo: index + 1 };
      }
      const indent = withoutComment.match(/^ */)[0].length;
      return {
        blank: false,
        lineNo: index + 1,
        indent,
        text: withoutComment.slice(indent).trimEnd()
      };
    });
  }

  function stripYamlComment(line) {
    let quote = null;
    let escaped = false;
    let bracketDepth = 0;
    let braceDepth = 0;

    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if (quote) {
        if (quote === "\"" && escaped) {
          escaped = false;
          continue;
        }
        if (quote === "\"" && ch === "\\") {
          escaped = true;
          continue;
        }
        if (ch === quote) {
          quote = null;
        }
        continue;
      }

      if (ch === "'" || ch === "\"") {
        quote = ch;
        continue;
      }
      if (ch === "[") bracketDepth += 1;
      if (ch === "]") bracketDepth = Math.max(0, bracketDepth - 1);
      if (ch === "{") braceDepth += 1;
      if (ch === "}") braceDepth = Math.max(0, braceDepth - 1);

      if (ch === "#" && bracketDepth === 0 && braceDepth === 0) {
        const prev = i === 0 ? "" : line[i - 1];
        if (i === 0 || /\s/.test(prev)) {
          return line.slice(0, i);
        }
      }
    }

    return line;
  }

  function skipYamlBlanks(lines, index) {
    let i = index;
    while (i < lines.length && lines[i].blank) i += 1;
    return i;
  }

  function parseYamlNode(lines, index, indent) {
    const i = skipYamlBlanks(lines, index);
    if (i >= lines.length) {
      return { value: null, nextIndex: i };
    }
    if (lines[i].indent !== indent) {
      throw new Error(`YAML parse error at line ${lines[i].lineNo}: unexpected indentation.`);
    }

    if (lines[i].text.startsWith("- ")) {
      return parseYamlSequence(lines, i, indent);
    }
    return parseYamlMapping(lines, i, indent);
  }

  function parseYamlMapping(lines, index, indent) {
    const obj = {};
    let i = index;

    while (true) {
      i = skipYamlBlanks(lines, i);
      if (i >= lines.length) break;
      if (lines[i].indent < indent) break;
      if (lines[i].indent > indent) {
        throw new Error(`YAML parse error at line ${lines[i].lineNo}: unexpected indentation inside mapping.`);
      }
      if (lines[i].text.startsWith("- ")) break;

      const colonIndex = findYamlMappingColon(lines[i].text);
      if (colonIndex === -1) {
        throw new Error(`YAML parse error at line ${lines[i].lineNo}: expected 'key: value'.`);
      }

      const rawKey = lines[i].text.slice(0, colonIndex).trim();
      const key = normalizeYamlKey(rawKey);
      const remainder = lines[i].text.slice(colonIndex + 1).trim();

      if (remainder === "") {
        const next = skipYamlBlanks(lines, i + 1);
        if (next >= lines.length || lines[next].indent <= indent) {
          obj[key] = null;
          i += 1;
          continue;
        }
        const child = parseYamlNode(lines, next, lines[next].indent);
        obj[key] = child.value;
        i = child.nextIndex;
        continue;
      }

      if (remainder === "|" || remainder === ">") {
        throw new Error(`YAML parse error at line ${lines[i].lineNo}: block scalars are not supported in this tool.`);
      }

      obj[key] = parseYamlScalar(remainder, lines[i].lineNo);
      i += 1;
    }

    return { value: obj, nextIndex: i };
  }

  function parseYamlSequence(lines, index, indent) {
    const arr = [];
    let i = index;

    while (true) {
      i = skipYamlBlanks(lines, i);
      if (i >= lines.length) break;
      if (lines[i].indent < indent) break;
      if (lines[i].indent > indent) {
        throw new Error(`YAML parse error at line ${lines[i].lineNo}: unexpected indentation inside sequence.`);
      }
      if (!lines[i].text.startsWith("- ")) break;

      const remainder = lines[i].text.slice(2).trim();
      if (remainder === "") {
        const next = skipYamlBlanks(lines, i + 1);
        if (next >= lines.length || lines[next].indent <= indent) {
          arr.push(null);
          i += 1;
          continue;
        }
        const child = parseYamlNode(lines, next, lines[next].indent);
        arr.push(child.value);
        i = child.nextIndex;
        continue;
      }

      if (isYamlInlineMapEntry(remainder)) {
        const { key, value } = parseYamlInlineMapEntry(remainder, lines[i].lineNo);
        const item = { [key]: value };
        i += 1;
        const next = skipYamlBlanks(lines, i);
        if (next < lines.length && lines[next].indent > indent) {
          const child = parseYamlNode(lines, next, lines[next].indent);
          if (!isPlainObject(child.value)) {
            throw new Error(`YAML parse error at line ${lines[next].lineNo}: expected mapping continuation for list item.`);
          }
          Object.assign(item, child.value);
          i = child.nextIndex;
        }
        arr.push(item);
        continue;
      }

      arr.push(parseYamlScalar(remainder, lines[i].lineNo));
      i += 1;
    }

    return { value: arr, nextIndex: i };
  }

  function isYamlInlineMapEntry(text) {
    return findYamlMappingColon(text) !== -1;
  }

  function parseYamlInlineMapEntry(text, lineNo) {
    const colonIndex = findYamlMappingColon(text);
    if (colonIndex === -1) {
      throw new Error(`YAML parse error at line ${lineNo}: invalid inline mapping entry.`);
    }
    const key = normalizeYamlKey(text.slice(0, colonIndex).trim());
    const remainder = text.slice(colonIndex + 1).trim();
    if (!remainder) return { key, value: null };
    return { key, value: parseYamlScalar(remainder, lineNo) };
  }

  function findYamlMappingColon(text) {
    let quote = null;
    let escaped = false;
    let bracketDepth = 0;
    let braceDepth = 0;

    for (let i = 0; i < text.length; i += 1) {
      const ch = text[i];
      if (quote) {
        if (quote === "\"" && escaped) {
          escaped = false;
          continue;
        }
        if (quote === "\"" && ch === "\\") {
          escaped = true;
          continue;
        }
        if (ch === quote) quote = null;
        continue;
      }

      if (ch === "'" || ch === "\"") {
        quote = ch;
        continue;
      }
      if (ch === "[") bracketDepth += 1;
      if (ch === "]") bracketDepth = Math.max(0, bracketDepth - 1);
      if (ch === "{") braceDepth += 1;
      if (ch === "}") braceDepth = Math.max(0, braceDepth - 1);

      if (ch === ":" && bracketDepth === 0 && braceDepth === 0) {
        const next = text[i + 1];
        if (next == null || /\s/.test(next)) return i;
      }
    }
    return -1;
  }

  function normalizeYamlKey(rawKey) {
    if ((rawKey.startsWith("'") && rawKey.endsWith("'")) || (rawKey.startsWith("\"") && rawKey.endsWith("\""))) {
      return String(parseYamlScalar(rawKey, 0));
    }
    return rawKey;
  }

  function parseYamlScalar(text, lineNo) {
    const value = text.trim();
    if (value === "|" || value === ">") {
      throw new Error(`YAML parse error at line ${lineNo}: block scalars are not supported in this tool.`);
    }

    if (value.startsWith("[") && value.endsWith("]")) {
      return parseYamlInlineList(value.slice(1, -1), lineNo);
    }
    if (value.startsWith("{") && value.endsWith("}")) {
      return parseYamlInlineMap(value.slice(1, -1), lineNo);
    }
    if (value.startsWith("'")) {
      if (!value.endsWith("'")) {
        throw new Error(`YAML parse error at line ${lineNo}: unterminated single-quoted scalar.`);
      }
      return value.slice(1, -1).replace(/''/g, "'");
    }
    if (value.startsWith("\"")) {
      if (!value.endsWith("\"")) {
        throw new Error(`YAML parse error at line ${lineNo}: unterminated double-quoted scalar.`);
      }
      return unescapeYamlDoubleQuoted(value.slice(1, -1));
    }

    const lower = value.toLowerCase();
    if (lower === "null" || lower === "~") return null;
    if (lower === "true") return true;
    if (lower === "false") return false;

    if (/^[-+]?\d+$/.test(value)) return Number(value);
    if (/^[-+]?\d+\.\d+$/.test(value)) return Number(value);

    return value;
  }

  function parseYamlInlineList(content, lineNo) {
    if (!content.trim()) return [];
    const items = splitYamlFlowParts(content, lineNo);
    return items.map((item) => parseYamlScalar(item, lineNo));
  }

  function parseYamlInlineMap(content, lineNo) {
    if (!content.trim()) return {};
    const parts = splitYamlFlowParts(content, lineNo);
    const obj = {};
    parts.forEach((part) => {
      const colonIndex = findYamlMappingColon(part);
      if (colonIndex === -1) {
        throw new Error(`YAML parse error at line ${lineNo}: invalid inline map entry '${part}'.`);
      }
      const key = normalizeYamlKey(part.slice(0, colonIndex).trim());
      const remainder = part.slice(colonIndex + 1).trim();
      obj[key] = remainder ? parseYamlScalar(remainder, lineNo) : null;
    });
    return obj;
  }

  function splitYamlFlowParts(content, lineNo) {
    const parts = [];
    let current = "";
    let quote = null;
    let escaped = false;
    let bracketDepth = 0;
    let braceDepth = 0;

    for (let i = 0; i < content.length; i += 1) {
      const ch = content[i];

      if (quote) {
        current += ch;
        if (quote === "\"" && escaped) {
          escaped = false;
          continue;
        }
        if (quote === "\"" && ch === "\\") {
          escaped = true;
          continue;
        }
        if (ch === quote) {
          quote = null;
        }
        continue;
      }

      if (ch === "'" || ch === "\"") {
        quote = ch;
        current += ch;
        continue;
      }
      if (ch === "[") bracketDepth += 1;
      if (ch === "]") bracketDepth -= 1;
      if (ch === "{") braceDepth += 1;
      if (ch === "}") braceDepth -= 1;

      if (ch === "," && bracketDepth === 0 && braceDepth === 0) {
        parts.push(current.trim());
        current = "";
        continue;
      }

      current += ch;
    }

    if (quote || bracketDepth !== 0 || braceDepth !== 0) {
      throw new Error(`YAML parse error at line ${lineNo}: malformed flow-style value.`);
    }

    if (current.trim()) parts.push(current.trim());
    return parts;
  }

  function unescapeYamlDoubleQuoted(value) {
    return value
      .replace(/\\n/g, "\n")
      .replace(/\\t/g, "\t")
      .replace(/\\r/g, "\r")
      .replace(/\\"/g, "\"")
      .replace(/\\\\/g, "\\");
  }

  function renderDiagram(model) {
    if (!model || !Array.isArray(model.services) || model.services.length === 0) {
      renderDiagramEmpty("No parsed services available.");
      return;
    }

    const diagramData = buildDiagramData(model);
    refs.diagramMeta.textContent = `${diagramData.services.length} service${diagramData.services.length === 1 ? "" : "s"} • ${diagramData.networks.length} network${diagramData.networks.length === 1 ? "" : "s"} • ${diagramData.dependencyEdges.length} dependency edge${diagramData.dependencyEdges.length === 1 ? "" : "s"}`;
    refs.diagramLegend.innerHTML = renderDiagramLegend(model);

    refs.diagramEmpty.textContent = "";
    refs.diagramEmpty.classList.add("is-hidden");
    refs.diagramSvg.classList.remove("is-hidden");
    refs.diagramSvg.setAttribute("viewBox", `0 0 ${diagramData.width} ${diagramData.height}`);
    refs.diagramSvg.innerHTML = renderDiagramSvg(diagramData);
  }

  function renderDiagramEmpty(message) {
    refs.diagramMeta.textContent = "No parsed services yet.";
    refs.diagramLegend.innerHTML = "";
    refs.diagramSvg.innerHTML = "";
    refs.diagramSvg.classList.add("is-hidden");
    refs.diagramEmpty.textContent = message;
    refs.diagramEmpty.classList.remove("is-hidden");
  }

  function buildDiagramData(model) {
    const services = model.services.map((service) => ({
      ...service,
      _portsPreview: buildPortsPreview(service.ports),
      _badges: buildServiceBadges(service)
    }));

    const networkMap = new Map();
    const serviceToNetworks = new Map();

    services.forEach((service) => {
      let networks = [];
      if (service.networkMode) {
        networks = [`mode:${service.networkMode}`];
      } else if (service.networks.length) {
        networks = service.networks.slice();
      } else {
        networks = ["default"];
      }
      serviceToNetworks.set(service.key, networks);
      networks.forEach((id) => {
        if (!networkMap.has(id)) {
          const isMode = id.startsWith("mode:");
          networkMap.set(id, {
            id,
            label: isMode ? id.slice(5) : id,
            kind: isMode ? "mode" : "network"
          });
        }
      });
    });

    if (Array.isArray(model.networks)) {
      model.networks.forEach((name) => {
        if (!name) return;
        if (!networkMap.has(name)) {
          networkMap.set(name, { id: name, label: name, kind: "network" });
        }
      });
    }

    const networks = Array.from(networkMap.values());
    const dependencyEdges = [];
    const serviceIndex = new Map(services.map((service, index) => [service.key, index]));

    services.forEach((service) => {
      service.dependsOn.forEach((target) => {
        if (serviceIndex.has(target)) {
          dependencyEdges.push({ from: service.key, to: target });
        }
      });
    });

    const networkWidth = 150;
    const networkHeight = 46;
    const serviceWidth = 238;
    const serviceHeight = 154;
    const gapX = 32;
    const gapY = 40;

    const networkSpan = Math.max(1, networks.length) * networkWidth + Math.max(0, networks.length - 1) * 24;
    const serviceCols = services.length <= 2 ? services.length : services.length <= 6 ? 3 : 4;
    const safeServiceCols = Math.max(1, serviceCols);
    const serviceSpan = safeServiceCols * serviceWidth + Math.max(0, safeServiceCols - 1) * gapX;
    const width = Math.max(980, networkSpan + 120, serviceSpan + 120);

    const networkY = 56;
    const servicesStartY = 148;
    const rows = Math.ceil(services.length / safeServiceCols);
    const height = Math.max(420, servicesStartY + rows * serviceHeight + Math.max(0, rows - 1) * gapY + 80);

    const networkPositions = new Map();
    const networksRowWidth = networks.length ? networks.length * networkWidth + (networks.length - 1) * 24 : networkWidth;
    let nx = Math.round((width - networksRowWidth) / 2);
    networks.forEach((network) => {
      networkPositions.set(network.id, { x: nx, y: networkY, w: networkWidth, h: networkHeight });
      nx += networkWidth + 24;
    });

    const servicePositions = new Map();
    for (let index = 0; index < services.length; index += 1) {
      const row = Math.floor(index / safeServiceCols);
      const col = index % safeServiceCols;
      const rowCount = Math.min(safeServiceCols, services.length - row * safeServiceCols);
      const rowWidth = rowCount * serviceWidth + Math.max(0, rowCount - 1) * gapX;
      const rowStartX = Math.round((width - rowWidth) / 2);
      const rowCol = col;
      const x = rowStartX + rowCol * (serviceWidth + gapX);
      const y = servicesStartY + row * (serviceHeight + gapY);
      servicePositions.set(services[index].key, { x, y, w: serviceWidth, h: serviceHeight });
    }

    return {
      width,
      height,
      services,
      networks,
      dependencyEdges,
      networkPositions,
      servicePositions,
      serviceToNetworks,
      constants: {
        networkHeight,
        serviceHeight
      }
    };
  }

  function renderDiagramSvg(data) {
    const grid = renderSvgGrid(data.width, data.height, 40);

    const networkEdges = [];
    data.services.forEach((service) => {
      const servicePos = data.servicePositions.get(service.key);
      const networkIds = data.serviceToNetworks.get(service.key) || [];
      networkIds.forEach((networkId, idx) => {
        const networkPos = data.networkPositions.get(networkId);
        if (!networkPos) return;
        const startX = servicePos.x + servicePos.w / 2 + (idx - (networkIds.length - 1) / 2) * 12;
        const startY = servicePos.y;
        const endX = networkPos.x + networkPos.w / 2;
        const endY = networkPos.y + networkPos.h;
        networkEdges.push(`<path class="edge-network" d="${buildCurvedPath(startX, startY, endX, endY)}" fill="none" />`);
      });
    });

    const depEdges = data.dependencyEdges.map((edge) => {
      const from = data.servicePositions.get(edge.from);
      const to = data.servicePositions.get(edge.to);
      if (!from || !to) return "";
      const startX = from.x + from.w / 2;
      const startY = from.y + from.h;
      const endX = to.x + to.w / 2;
      const endY = to.y;
      return `<path class="edge-dep" d="${buildCurvedPath(startX, startY, endX, endY, 34)}" fill="none" />`;
    });

    const networkNodes = data.networks.map((network) => {
      const pos = data.networkPositions.get(network.id);
      const isMode = network.kind === "mode";
      const title = truncateMiddle(network.label, 22);
      const sub = isMode ? "network_mode" : "network";
      return [
        `<g transform="translate(${pos.x}, ${pos.y})">`,
        `<rect class="network-node${isMode ? " mode" : ""}" x="0" y="0" width="${pos.w}" height="${pos.h}" rx="14" ry="14" />`,
        `<text class="network-node-text" x="${pos.w / 2}" y="20">${escapeXml(title)}</text>`,
        `<text class="network-node-subtext" x="${pos.w / 2}" y="34">${escapeXml(sub)}</text>`,
        "</g>"
      ].join("");
    });

    const serviceNodes = data.services.map((service) => {
      const pos = data.servicePositions.get(service.key);
      const title = truncateMiddle(service.containerName || service.key, 28);
      const image = truncateMiddle(service.image || service.buildHint || "(no image)", 32);
      const networks = (data.serviceToNetworks.get(service.key) || []).map((id) => {
        const net = data.networks.find((item) => item.id === id);
        return net ? net.label : id;
      });
      const networkLabel = truncateMiddle(networks.join(", "), 30);
      const depends = truncateMiddle(service.dependsOn.join(", "), 30);
      const command = truncateMiddle(formatCommandPreview(service.command), 30);

      const portPills = renderSvgPills(service._portsPreview, pos.x + 12, pos.y + 104, "port");
      const badgePills = renderSvgPills(service._badges, pos.x + 12, pos.y + 128, "badge");

      return [
        `<g transform="translate(${pos.x}, ${pos.y})">`,
        `<rect class="service-box" x="0" y="0" width="${pos.w}" height="${pos.h}" rx="14" ry="14" />`,
        `<rect class="service-accent" x="8" y="8" width="${pos.w - 16}" height="26" rx="8" ry="8" />`,
        `<text class="service-title" x="14" y="25">${escapeXml(title)}</text>`,
        `<text class="service-image" x="14" y="47">${escapeXml(image)}</text>`,
        `<text class="service-meta" x="14" y="64">net: ${escapeXml(networkLabel || "default")}</text>`,
        service.dependsOn.length ? `<text class="service-meta" x="14" y="79">deps: ${escapeXml(depends)}</text>` : `<text class="service-meta" x="14" y="79">deps: none</text>`,
        command ? `<text class="service-meta" x="14" y="92">cmd: ${escapeXml(command)}</text>` : `<text class="service-meta" x="14" y="92">cmd: default</text>`,
        `</g>`,
        portPills,
        badgePills
      ].join("");
    });

    return [
      "<defs>",
      '<marker id="depArrow" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto">',
      '<path d="M0,0 L9,4.5 L0,9 z" fill="rgba(255, 211, 122, 0.75)" />',
      "</marker>",
      "</defs>",
      grid,
      `<g>${networkEdges.join("")}</g>`,
      `<g>${depEdges.join("")}</g>`,
      `<g>${networkNodes.join("")}</g>`,
      `<g>${serviceNodes.join("")}</g>`
    ].join("");
  }

  function renderSvgGrid(width, height, spacing) {
    const verticals = [];
    const horizontals = [];
    for (let x = 0; x <= width; x += spacing) {
      verticals.push(`<line x1="${x}" y1="0" x2="${x}" y2="${height}" />`);
    }
    for (let y = 0; y <= height; y += spacing) {
      horizontals.push(`<line x1="0" y1="${y}" x2="${width}" y2="${y}" />`);
    }
    return `<g class="bg-grid">${verticals.join("")}${horizontals.join("")}</g>`;
  }

  function buildCurvedPath(x1, y1, x2, y2, offset = 28) {
    const c1x = x1;
    const c1y = y1 - offset;
    const c2x = x2;
    const c2y = y2 + offset;
    return `M ${round(x1)} ${round(y1)} C ${round(c1x)} ${round(c1y)}, ${round(c2x)} ${round(c2y)}, ${round(x2)} ${round(y2)}`;
  }

  function renderSvgPills(items, startX, y, kind) {
    if (!items.length) return "";
    let x = startX;
    const parts = [];
    const maxWidth = 220;
    const className = kind === "port" ? "port-pill" : "badge-pill";
    const textClass = kind === "port" ? "port-pill-text" : "badge-pill-text";

    for (const item of items) {
      const text = truncateMiddle(String(item), 18);
      const width = Math.min(88, Math.max(28, text.length * 6.2 + 14));
      if (x + width - startX > maxWidth) break;
      const extraClass = kind === "badge" && String(item).startsWith("dep:") ? " warn" : "";
      parts.push(`<rect class="${className}${extraClass}" x="${round(x)}" y="${round(y)}" width="${round(width)}" height="18" rx="9" ry="9" />`);
      parts.push(`<text class="${textClass}" x="${round(x + 7)}" y="${round(y + 12)}">${escapeXml(text)}</text>`);
      x += width + 6;
    }
    return parts.join("");
  }

  function renderDiagramLegend(model) {
    return model.services
      .map((service) => {
        const pills = [];
        const networks = service.networkMode ? [`mode:${service.networkMode}`] : service.networks.length ? service.networks : ["default"];
        networks.forEach((network) => pills.push(`<span class="legend-pill network">${escapeHtml(network)}</span>`));
        service.dependsOn.forEach((dep) => pills.push(`<span class="legend-pill dep">depends ${escapeHtml(dep)}</span>`));
        if (!service.dependsOn.length) pills.push('<span class="legend-pill">no depends_on</span>');
        if (service.ports.length) pills.push(`<span class="legend-pill">${escapeHtml(service.ports.length)} port${service.ports.length === 1 ? "" : "s"}</span>`);
        if (service.volumes.length) pills.push(`<span class="legend-pill">${escapeHtml(service.volumes.length)} volume${service.volumes.length === 1 ? "" : "s"}</span>`);
        if (service.environment.length) pills.push(`<span class="legend-pill">${escapeHtml(service.environment.length)} env</span>`);

        return [
          '<div class="legend-item">',
          '<div class="legend-item-head">',
          `<p class="legend-item-title mono">${escapeHtml(service.containerName || service.key)}</p>`,
          `<p class="legend-item-image mono">${escapeHtml(service.image || service.buildHint || "(no image)")}</p>`,
          "</div>",
          `<div class="legend-item-meta">${pills.join("")}</div>`,
          "</div>"
        ].join("");
      })
      .join("");
  }

  function buildPortsPreview(ports) {
    if (!ports.length) return ["no ports"];
    const preview = ports.slice(0, 2).map((value) => String(value));
    if (ports.length > 2) preview.push(`+${ports.length - 2}`);
    return preview;
  }

  function buildServiceBadges(service) {
    const badges = [];
    if (service.environment.length) badges.push(`env:${service.environment.length}`);
    if (service.volumes.length) badges.push(`vol:${service.volumes.length}`);
    if (service.dependsOn.length) badges.push(`dep:${service.dependsOn.length}`);
    if (service.tty) badges.push("tty");
    if (service.stdinOpen) badges.push("stdin");
    if (!badges.length) badges.push("minimal");
    return badges.slice(0, 4);
  }

  function formatCommandPreview(command) {
    if (command == null) return "";
    if (Array.isArray(command)) return command.join(" ");
    return String(command);
  }

  function setStatus(kind, message, options = {}) {
    const { detected, outputKind, warnings = [] } = options;

    if (typeof detected !== "undefined") state.lastDetected = detected;
    if (typeof outputKind !== "undefined") state.lastOutputKind = outputKind;

    refs.statusBadge.className = `status-badge ${kind}`;
    refs.statusBadge.textContent = kind;
    refs.statusMessage.textContent = message;

    const detectedLabel = state.lastDetected || "—";
    const outputLabel =
      state.lastOutputKind === "compose-yaml"
        ? "Compose YAML"
        : state.lastOutputKind === "docker-run"
          ? "docker run"
          : "—";

    refs.statusMeta.textContent = `Detected: ${detectedLabel} • Last output: ${outputLabel}`;
    renderWarnings(warnings);
  }

  function renderWarnings(warnings) {
    const list = Array.isArray(warnings) ? warnings.filter(Boolean) : [];
    if (!list.length) {
      refs.warningList.innerHTML = "";
      refs.warningBlock.classList.add("is-hidden");
      refs.warningBlock.dataset.items = "";
      return;
    }

    refs.warningList.innerHTML = list.map((warning) => `<li>${escapeHtml(warning)}</li>`).join("");
    refs.warningBlock.classList.remove("is-hidden");
    refs.warningBlock.dataset.items = JSON.stringify(list);
  }

  function getVisibleWarnings() {
    try {
      const raw = refs.warningBlock.dataset.items;
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function copyText(text) {
    if (navigator.clipboard?.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise((resolve, reject) => {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.top = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand("copy");
        ta.remove();
        if (ok) resolve();
        else reject(new Error("execCommand copy failed"));
      } catch (error) {
        reject(error);
      }
    });
  }

  function flashButton(button) {
    button.classList.add("flash-ok");
    window.setTimeout(() => button.classList.remove("flash-ok"), 700);
  }

  function isEnvAssignmentToken(token) {
    return /^[A-Za-z_][A-Za-z0-9_]*=.*/.test(token);
  }

  function inferServiceNameFromImage(image) {
    let value = String(image || "");
    if (!value) return "";
    const atIndex = value.indexOf("@");
    if (atIndex !== -1) value = value.slice(0, atIndex);
    const slash = value.lastIndexOf("/");
    const colon = value.lastIndexOf(":");
    if (colon > slash) value = value.slice(0, colon);
    return value.slice(slash + 1) || value;
  }

  function sanitizeServiceKey(value) {
    const base = String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return base || "service";
  }

  function ensureUniqueServiceKey(key, usageMap) {
    const base = sanitizeServiceKey(key);
    const used = usageMap.get(base) || 0;
    usageMap.set(base, used + 1);
    if (used === 0) return base;
    return `${base}-${used + 1}`;
  }

  function dedupeServiceKeysInPlace(services, warnings) {
    const usage = new Map();
    services.forEach((service) => {
      const original = service.key;
      service.key = ensureUniqueServiceKey(service.key, usage);
      if (service.key !== original) {
        warnings.push(`Duplicate service key '${original}' renamed to '${service.key}'.`);
      }
    });
    return services;
  }

  function isSpecialNetworkMode(value) {
    const v = String(value || "");
    return v === "host" || v === "none" || v === "bridge" || v.startsWith("container:") || v.startsWith("service:");
  }

  function isImplicitDefaultNetwork(value) {
    return String(value || "") === "default";
  }

  function toOptionalString(value) {
    if (value == null) return "";
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    return "";
  }

  function toBoolean(value) {
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      const lower = value.toLowerCase();
      return lower === "true" || lower === "yes" || lower === "on";
    }
    return false;
  }

  function normalizeError(error) {
    return error instanceof Error ? error : new Error(String(error));
  }

  function dedupeStrings(values) {
    const out = [];
    const seen = new Set();
    values.forEach((value) => {
      const key = String(value);
      if (!seen.has(key)) {
        seen.add(key);
        out.push(key);
      }
    });
    return out;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function escapeXml(value) {
    return escapeHtml(value).replace(/'/g, "&apos;");
  }

  function truncateMiddle(value, maxLen) {
    const text = String(value || "");
    if (text.length <= maxLen) return text;
    if (maxLen <= 3) return text.slice(0, maxLen);
    const half = Math.floor((maxLen - 1) / 2);
    return `${text.slice(0, half)}…${text.slice(text.length - (maxLen - half - 1))}`;
  }

  function round(value) {
    return Math.round(value * 10) / 10;
  }

  function isPlainObject(value) {
    return Object.prototype.toString.call(value) === "[object Object]";
  }
})();
