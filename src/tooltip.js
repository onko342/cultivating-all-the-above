"use strict";

//Tooltip system. Any element can get a tooltip with setTooltip(); one shared box is reused for all of them.
//Content is returned by a function (called on every show/refresh) so it always reflects live values.
//
//Content spec (the provider may return any of these, or null for "no tooltip right now"):
//  "html string" | Node | { title, body, rows: [[label, value], ...], footer, variant }
//All strings are inserted as HTML, so pass t()/tHTML() output, never raw user input.
//variant: optional name, adds the class "tooltip-variant-<name>" (see style.css)

const gap_from_cursor = 12; //px between the entry point and the box
const edge_margin = 4; //px kept free at the screen edges

const tooltip_sources = new WeakMap(); //element -> content provider
let box = null;

const state = {
    owner: null, //element the visible tooltip belongs to
    anchor_x: 0, //where the cursor first entered the owner
    anchor_y: 0,
    pointer_x: 0, //latest cursor position (needed when Ctrl is released)
    pointer_y: 0,
    ctrl_held: false,
};

export function setTooltip(target, getContent) {
    const element = typeof target === "string" ? document.getElementById(target) : target;
    if (element) tooltip_sources.set(element, getContent);
}

export function removeTooltip(target) {
    const element = typeof target === "string" ? document.getElementById(target) : target;
    if (element) {
        if (state.owner === element) hideTooltip();
        tooltip_sources.delete(element);
    }
}

//Re-renders the visible tooltip (e.g. after values changed) and keeps it at the same anchor
export function refreshTooltip() {
    if (!state.owner) return;
    if (state.owner.getClientRects().length === 0 || !renderContent()) {
        hideTooltip(); //owner was removed/hidden or no longer has content
        return;
    }
    placeTooltip();
}

export function hideTooltip() {
    state.owner = null;
    if (box) box.hidden = true;
}

function findOwner(node) {
    for (let element = node; element; element = element.parentElement) {
        if (tooltip_sources.has(element)) return element;
    }
    return null;
}

function makeBlock(class_name, value) {
    const block = document.createElement("div");
    block.className = class_name;
    if (value instanceof Node) block.appendChild(value);
    else block.innerHTML = value;
    return block;
}

//Builds the box contents. Returns false when there is nothing to show.
function renderContent() {
    const getContent = tooltip_sources.get(state.owner);
    let content = getContent ? getContent() : null;
    if (content === null || content === undefined || content === "") return false;
    if (typeof content === "string" || content instanceof Node) content = { body: content };

    const fragment = document.createDocumentFragment();
    if (content.title) fragment.appendChild(makeBlock("tooltip-title", content.title));
    if (content.body) fragment.appendChild(makeBlock("tooltip-body", content.body));
    if (content.rows && content.rows.length > 0) {
        const table = document.createElement("table");
        table.className = "tooltip-table";
        const table_body = document.createElement("tbody");
        content.rows.forEach(([label, value]) => {
            const row = document.createElement("tr");
            const label_cell = document.createElement("td");
            label_cell.className = "tooltip-row-label";
            label_cell.innerHTML = label;
            const value_cell = document.createElement("td");
            value_cell.className = "tooltip-row-value";
            value_cell.innerHTML = value;
            row.append(label_cell, value_cell);
            table_body.appendChild(row);
        });
        table.appendChild(table_body);
        fragment.appendChild(table);
    }
    if (content.footer) fragment.appendChild(makeBlock("tooltip-footer", content.footer));

    box.className = content.variant ? `tooltip tooltip-variant-${content.variant}` : "tooltip";
    box.classList.toggle("is-pinned", state.ctrl_held);
    box.replaceChildren(fragment);
    return true;
}

function fits(x, y, width, height, view_width, view_height) {
    return x >= edge_margin && y >= edge_margin
        && x + width <= view_width - edge_margin
        && y + height <= view_height - edge_margin;
}

//Priority: bottom-right, bottom-left, top-right, top-left. If none fit, bottom-right clamped onto the screen.
function placeTooltip() {
    //measure at the origin so the box isn't squeezed by the screen edge
    box.style.left = "0px";
    box.style.top = "0px";
    box.style.visibility = "hidden";
    box.hidden = false;
    const { width, height } = box.getBoundingClientRect();
    const view_width = document.documentElement.clientWidth;
    const view_height = document.documentElement.clientHeight;
    const { anchor_x, anchor_y } = state;

    const right_x = anchor_x + gap_from_cursor;
    const left_x = anchor_x - gap_from_cursor - width;
    const below_y = anchor_y + gap_from_cursor;
    const above_y = anchor_y - gap_from_cursor - height;

    const candidates = [[right_x, below_y], [left_x, below_y], [right_x, above_y], [left_x, above_y]];
    let position = candidates.find(([x, y]) => fits(x, y, width, height, view_width, view_height));
    if (!position) {
        position = [
            Math.max(edge_margin, Math.min(right_x, view_width - width - edge_margin)),
            Math.max(edge_margin, Math.min(below_y, view_height - height - edge_margin)),
        ];
    }
    box.style.left = `${position[0]}px`;
    box.style.top = `${position[1]}px`;
    box.style.visibility = "";
}

function showTooltip(owner, x, y) {
    state.owner = owner;
    state.anchor_x = x;
    state.anchor_y = y;
    if (renderContent()) placeTooltip();
    else hideTooltip();
}

function pointerIsOverOwner() {
    const element = document.elementFromPoint(state.pointer_x, state.pointer_y);
    return !!element && !!state.owner && state.owner.contains(element);
}

export function initTooltips() {
    box = document.createElement("div");
    box.className = "tooltip";
    box.setAttribute("role", "tooltip");
    box.hidden = true;
    document.body.appendChild(box);

    document.addEventListener("mouseover", (event) => {
        state.pointer_x = event.clientX;
        state.pointer_y = event.clientY;
        if (box.contains(event.target)) return;
        if (state.ctrl_held && state.owner) return; //pinned: stays until Ctrl is released
        const owner = findOwner(event.target);
        if (!owner || owner === state.owner) return; //moving between children of the same owner keeps the tooltip put
        showTooltip(owner, event.clientX, event.clientY);
    });

    document.addEventListener("mouseout", (event) => {
        if (!state.owner || state.ctrl_held) return;
        const destination = event.relatedTarget;
        if (destination && state.owner.contains(destination)) return;
        hideTooltip();
    });

    document.addEventListener("mousemove", (event) => {
        state.pointer_x = event.clientX;
        state.pointer_y = event.clientY;
    }, { passive: true });

    document.addEventListener("keydown", (event) => {
        if (event.key !== "Control" || state.ctrl_held) return;
        state.ctrl_held = true;
        if (state.owner) box.classList.add("is-pinned");
    });

    document.addEventListener("keyup", (event) => {
        if (event.key !== "Control") return;
        state.ctrl_held = false;
        box.classList.remove("is-pinned");
        if (state.owner && !pointerIsOverOwner()) hideTooltip();
    });

    window.addEventListener("blur", () => {
        state.ctrl_held = false;
        hideTooltip();
    });

    //the owner moves when something scrolls, so the anchor would no longer make sense
    window.addEventListener("scroll", () => {
        if (!state.ctrl_held) hideTooltip();
    }, true);

    window.addEventListener("resize", () => {
        if (state.owner) placeTooltip();
    });
}