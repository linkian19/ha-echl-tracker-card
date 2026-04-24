/**
 * ECHL Tracker Card
 * https://github.com/linkian19/ha-echl-tracker-card
 */
import { LitElement, html, css } from "https://unpkg.com/lit@2.8.0/index.js?module";

// ---------------------------------------------------------------------------
// Editor — uses ha-form for the standard HA configuration UI
// ---------------------------------------------------------------------------

class EchlTrackerCardEditor extends LitElement {
  static get properties() {
    return { hass: {}, config: {} };
  }

  setConfig(config) {
    this.config = config;
  }

  static get _schema() {
    return [
      {
        name: "entity",
        required: true,
        selector: { entity: { domain: "sensor" } },
      },
      {
        name: "title",
        selector: { text: {} },
      },
      {
        name: "logo_url",
        selector: { text: {} },
      },
      {
        name: "show_logo",
        selector: { boolean: {} },
      },
      {
        name: "show_shots",
        selector: { boolean: {} },
      },
      {
        name: "show_next_game",
        selector: { boolean: {} },
      },
    ];
  }

  _computeLabel(schema) {
    const labels = {
      entity: "Sensor Entity",
      title: "Card Title (leave blank to use team name)",
      logo_url: "Team Logo URL (optional)",
      show_logo: "Show team logo",
      show_shots: "Show shots on goal",
      show_next_game: "Show next game when no game is active",
    };
    return labels[schema.name] ?? schema.name;
  }

  _valueChanged(ev) {
    ev.stopPropagation();
    this.dispatchEvent(
      new CustomEvent("config-changed", { detail: { config: ev.detail.value } })
    );
  }

  render() {
    if (!this.hass || !this.config) return html``;
    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this.config}
        .schema=${EchlTrackerCardEditor._schema}
        .computeLabel=${this._computeLabel}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }
}

customElements.define("echl-tracker-card-editor", EchlTrackerCardEditor);

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

class EchlTrackerCard extends LitElement {
  static get properties() {
    return { hass: {}, config: {} };
  }

  static get styles() {
    return css`
      :host { display: block; }

      .content { padding: 16px; }

      /* ── Header ─────────────────────────────────────── */
      .header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 14px;
      }
      .team-logo {
        width: 44px;
        height: 44px;
        object-fit: contain;
        flex-shrink: 0;
      }
      .team-name {
        font-size: 1.05rem;
        font-weight: 600;
        color: var(--primary-text-color);
        flex: 1;
      }

      /* ── State badge ────────────────────────────────── */
      .badge {
        padding: 3px 9px;
        border-radius: 99px;
        font-size: 0.7rem;
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        white-space: nowrap;
      }
      .badge-live  { background: #d32f2f; color: #fff; }
      .badge-pre   { background: #1565c0; color: #fff; }
      .badge-final { background: var(--secondary-text-color); color: #fff; }
      .badge-none  { background: var(--disabled-color, #9e9e9e); color: #fff; }

      /* ── Scoreboard ─────────────────────────────────── */
      .scoreboard {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 14px 0;
        border-top: 1px solid var(--divider-color);
        border-bottom: 1px solid var(--divider-color);
        margin-bottom: 10px;
      }
      .team-block { flex: 1; text-align: center; }
      .team-label {
        font-size: 0.78rem;
        color: var(--secondary-text-color);
        margin-bottom: 6px;
        line-height: 1.2;
      }
      .score {
        font-size: 2.6rem;
        font-weight: 700;
        color: var(--primary-text-color);
        line-height: 1;
      }
      .vs {
        font-size: 1.2rem;
        color: var(--secondary-text-color);
        padding: 0 8px;
        flex-shrink: 0;
      }

      /* ── Period / clock ─────────────────────────────── */
      .period-row {
        text-align: center;
        font-size: 0.88rem;
        font-weight: 500;
        color: var(--secondary-text-color);
        margin-bottom: 8px;
      }

      /* ── Stats ──────────────────────────────────────── */
      .stats-row {
        display: flex;
        justify-content: space-between;
        font-size: 0.8rem;
        color: var(--secondary-text-color);
        padding: 0 4px;
        margin-top: 4px;
      }
      .stats-label { text-align: center; }

      /* ── No game / next game ────────────────────────── */
      .no-game {
        text-align: center;
        padding: 18px 0 8px;
        color: var(--secondary-text-color);
        font-size: 0.9rem;
      }
      .next-game {
        border-top: 1px solid var(--divider-color);
        padding-top: 10px;
        margin-top: 10px;
      }
      .next-game-label {
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--secondary-text-color);
        margin-bottom: 4px;
      }
      .next-game-detail { font-size: 0.88rem; color: var(--primary-text-color); }
      .next-game-sub    { font-size: 0.8rem;  color: var(--secondary-text-color); margin-top: 2px; }
    `;
  }

  static getConfigElement() {
    return document.createElement("echl-tracker-card-editor");
  }

  static getStubConfig() {
    return { entity: "", show_logo: true, show_shots: true, show_next_game: true };
  }

  setConfig(config) {
    if (!config.entity) throw new Error("Required: entity");
    this.config = { show_logo: true, show_shots: true, show_next_game: true, ...config };
  }

  getCardSize() { return 3; }

  render() {
    if (!this.hass || !this.config) return html``;

    const stateObj = this.hass.states[this.config.entity];
    if (!stateObj) {
      return html`
        <ha-card>
          <div class="content">Entity not found: ${this.config.entity}</div>
        </ha-card>`;
    }

    const state = stateObj.state;
    const a = stateObj.attributes;

    return html`
      <ha-card>
        <div class="content">
          ${this._renderHeader(a, state)}
          ${state === "NO_GAME" ? this._renderNoGame(a) : this._renderGame(a, state)}
        </div>
      </ha-card>
    `;
  }

  _renderHeader(a, state) {
    const title = this.config.title
      || (a.is_home ? a.home_team : a.away_team)
      || "ECHL";

    const badgeClass = { LIVE: "badge-live", PRE: "badge-pre", FINAL: "badge-final", NO_GAME: "badge-none" }[state] ?? "badge-none";
    const badgeLabel = state === "NO_GAME" ? "No Game" : state;

    return html`
      <div class="header">
        ${this.config.show_logo ? html`
          ${this.config.logo_url
            ? html`<img class="team-logo" src="${this.config.logo_url}" alt="logo">`
            : html`<ha-icon icon="mdi:hockey-puck"></ha-icon>`}
        ` : ""}
        <span class="team-name">${title}</span>
        <span class="badge ${badgeClass}">${badgeLabel}</span>
      </div>
    `;
  }

  _renderGame(a, state) {
    return html`
      <div class="scoreboard">
        <div class="team-block">
          <div class="team-label">${a.away_team ?? "Away"}</div>
          <div class="score">${a.away_score ?? "—"}</div>
        </div>
        <div class="vs">@</div>
        <div class="team-block">
          <div class="team-label">${a.home_team ?? "Home"}</div>
          <div class="score">${a.home_score ?? "—"}</div>
        </div>
      </div>

      ${state === "LIVE" && (a.period || a.clock) ? html`
        <div class="period-row">
          ${a.period ? `Period ${a.period}` : ""}${a.clock ? ` · ${a.clock}` : ""}
        </div>
      ` : ""}

      ${this.config.show_shots && (a.away_shots != null || a.home_shots != null) ? html`
        <div class="stats-row">
          <span>${a.away_shots ?? "—"}</span>
          <span class="stats-label">Shots on Goal</span>
          <span>${a.home_shots ?? "—"}</span>
        </div>
      ` : ""}

      ${a.venue ? html`
        <div class="stats-row">
          <span style="flex:1;text-align:center">${a.venue}</span>
        </div>
      ` : ""}
    `;
  }

  _renderNoGame(a) {
    const hasNext = this.config.show_next_game && a.next_game_date;
    return html`
      <div class="no-game">No game scheduled today</div>
      ${hasNext ? html`
        <div class="next-game">
          <div class="next-game-label">Next Game</div>
          <div class="next-game-detail">
            ${a.next_game_home ? "vs" : "@"} ${a.next_game_opponent ?? "TBD"}
          </div>
          <div class="next-game-sub">${this._fmtDate(a.next_game_date)}</div>
          ${a.next_game_venue ? html`<div class="next-game-sub">${a.next_game_venue}</div>` : ""}
        </div>
      ` : ""}
    `;
  }

  _fmtDate(iso) {
    try {
      return new Date(iso).toLocaleString(undefined, {
        weekday: "short", month: "short", day: "numeric",
        hour: "numeric", minute: "2-digit",
      });
    } catch {
      return iso;
    }
  }
}

customElements.define("echl-tracker-card", EchlTrackerCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "echl-tracker-card",
  name: "ECHL Tracker Card",
  description: "Live scores, schedule, and stats for an ECHL team.",
  preview: false,
  documentationURL: "https://github.com/linkian19/ha-echl-tracker-card",
});
