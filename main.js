let cachedAccessControlToken = null;

async function getAccessControlToken() {
  if (cachedAccessControlToken) {
    return cachedAccessControlToken;
  }

  const tokenResp = await fetch(".netlify/functions/generate-token", {
    credentials: "include",
  });

  if (tokenResp.status !== 200) {
    cachedAccessControlToken = null;
    throw new Error("failed to access control token for user");
  }

  const { accessControlToken } = await tokenResp.json();

  cachedAccessControlToken = accessControlToken;

  return accessControlToken;
}

class NetlifyLogsService {
  constructor(options = {}) {
    this.options = options;
    this.logs = [];
    this.shouldReconnect = true;
    // this.ws = this.connect();
  }

  destroy() {
    this.shouldReconnect = false;
    window.clearInterval(this.reconnectTimeout);
    this.notifyLogsUpdated.cancel();
    this.ws.close();
  }

  connect(options) {
    this.ws = new WebSocket("wss://socketeer.services.netlify.com/build/logs");
    this.ws.addEventListener("open", () => {
      getAccessControlToken()
        .then((accessToken) => {
          this.ws.send(
            JSON.stringify({
              deploy_id: options.deployId || this.options.deployId,
              site_id: options.siteId || this.options.siteId,
              access_token: accessToken,
            })
          );
        })
        .catch((error) => {
          console.error(
            "NetlifyLogsService failed to get access control token",
            error
          );
        });
    });
    this.ws.addEventListener("message", (event) => {
      try {
        const data = JSON.parse(event.data);
        const ts = new Date(data.ts).getTime();

        if (data.type === "error") {
          throw data;
        }

        this.logs ??= [];
        this.logs.push({
          id: `${ts}${this.logs.length}`,
          timestamp: ts,
          message: data.message,
        });
        this.notifyLogsUpdated();
      } catch (e) {
        if (e?.type === "error" && e.status === 401) {
          console.error("NetlifyLogsService no permission");
          this.options.onForbidden?.();
          return;
        }
        console.error(`NetlifyLogsService can't decode socket message`, e);
      }
    });
    this.ws.addEventListener("close", () => {
      console.info(`NetlifyLogsService socket closed`);
      if (this.shouldReconnect) {
        this.reconnectTimeout = window.setTimeout(
          () => this.connect(),
          this.options.reconnect ?? 1000
        );
      }
    });
    this.ws.addEventListener("error", (error) => {
      console.error(`NetlifyLogsService socket got error`, error);
      this.ws.close();
    });
    return this.ws;
  }

  notifyLogsUpdated = (function () {
    let timeout;
    return function () {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        this.options.onLogsUpdated?.([...(this.logs ?? [])]);
      }, 250);
    };
  })();
}

const logsService = new NetlifyLogsService({
  deployId: "your-deploy-id",
  siteId: "your-site-id",
  onLogsUpdated: (logs) => {
    // Handle updated logs
  },
  onForbidden: () => {
    // Handle forbidden access
  },
  reconnect: 2000, // Optional reconnect timeout in ms
});

// Initialize the logs service
const netlifyLogs = new NetlifyLogsService({
  onLogsUpdated: (logs) => {
    // Update UI with new logs
    const logContainer = document.querySelector("#logs");
    if (logContainer) {
      logContainer.innerHTML = logs
        .map(
          (log) => `
                    <div class="log-entry">
                        <span class="timestamp">${new Date(
                          log.timestamp
                        ).toLocaleTimeString()}</span>
                        <span class="message">${log.message}</span>
                    </div>
                `
        )
        .join("");
    }
  },
  onForbidden: () => {
    console.error("Access forbidden - please check your credentials");
    // Optionally show error message to user
    alert("Unable to access logs - permission denied");
  },
  reconnect: 3000,
});

document.getElementById("connect").addEventListener("click", () => {
  const deployId = document.getElementById("deployId").value;
  const siteId = document.getElementById("siteId").value;
  netlifyLogs.connect({ deployId, siteId });
});
