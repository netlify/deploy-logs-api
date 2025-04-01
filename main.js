async function getAccessControlToken(options) {
  const queryParams = new URLSearchParams();
  Object.entries(options).forEach(([key, value]) => {
    queryParams.set(key, value);
  });
  const tokenResp = await fetch(
    `.netlify/functions/generate-token?${queryParams.toString()}`,
    {
      credentials: "include",
    }
  );

  if (tokenResp.status !== 200) {
    throw new Error("failed to access control token for user");
  }

  const { accessControlToken } = await tokenResp.json();

  return accessControlToken;
}

class NetlifyLogsService {
  constructor(options = {}) {
    this.options = options;
    this.logs = [];
    this.url = options.url;
    this.shouldReconnect = true;
  }

  destroy() {
    this.shouldReconnect = false;
    window.clearInterval(this.reconnectTimeout);
    this.notifyLogsUpdated.cancel();
    this.ws.close();
  }

  connect(options) {
    this.ws = new WebSocket(this.url);
    this.ws.addEventListener("open", () => {
      getAccessControlToken(options.accessControlTokenOptions)
        .then((accessToken) => {
          this.ws.send(
            JSON.stringify({
              ...options.logsPayload,
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
const netlifyDeployLogs = new NetlifyLogsService({
  url: "wss://socketeer.services.netlify.com/build/logs",
  onLogsUpdated: (logs) => {
    // Update UI with new logs
    const logContainer = document.querySelector("#deploy-logs");
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

const netlifyFunctionLogs = new NetlifyLogsService({
  url: "wss://socketeer.services.netlify.com/function/logs",
  onLogsUpdated: (logs) => {
    // Update UI with new logs
    const logContainer = document.querySelector("#function-logs");
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

const netlifyEdgeFunctionLogs = new NetlifyLogsService({
  url: "wss://socketeer.services.netlify.com/edge-function/logs",
  onLogsUpdated: (logs) => {
    // Update UI with new logs
    const logContainer = document.querySelector("#edge-function-logs");
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
});
document.getElementById("connect-deploy-logs").addEventListener("click", () => {
  const deployId = document.getElementById("deployId").value;
  const siteId = document.getElementById("siteId").value;
  netlifyDeployLogs.connect({
    accessControlTokenOptions: { deploy_id: deployId, site_id: siteId },
    logsPayload: { deploy_id: deployId, site_id: siteId },
  });
});

document
  .getElementById("connect-function-logs")
  .addEventListener("click", () => {
    const functionId = document.getElementById("functionId").value;
    const accountId = document.getElementById("accountId").value;
    const siteId = document.getElementById("siteId").value;

    netlifyFunctionLogs.connect({
      accessControlTokenOptions: {
        function_id: functionId,
        account_id: accountId,
        site_id: siteId,
      },
      logsPayload: {
        function_id: functionId,
        account_id: accountId,
        site_id: siteId,
      },
    });
  });

document
  .getElementById("connect-edge-function-logs")
  .addEventListener("click", () => {
    const deployId = document.getElementById("edgeDeployId").value;
    const siteId = document.getElementById("siteId").value;
    netlifyEdgeFunctionLogs.connect({
      accessControlTokenOptions: { deploy_id: deployId, site_id: siteId },
      logsPayload: {
        deploy_id: deployId,
        site_id: siteId,
        since: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      },
    });
  });
