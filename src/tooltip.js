"use strict";

//Tooltip system. Any element can get a tooltip with setTooltip(); one shared box is reused for all of them.
//Content is returned by a function (called on every show/refresh) so it always reflects live values.
//
//Content spec (the provider may return any of these, or null for "no tooltip right now"):
//  "html string" | Node | { title, body, tag, rows, sections, footer, variant }
//  tag: one small line under the body (e.g. "Rare Title")
//  rows: [[label, value], ...] (aligned table)
//  sections: [{ heading, rows, items, table }, ...]
//    heading is underlined; rows = [[label, value], ...] aligned table; items = [[name, text], ...] wrapped lines;
//    table = { head: [...], rows: [[...], ...], foot: [...] } for tables with several columns (first column left, others right)

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
function buildTable(rows) {
    const table = document.createElement("table");
    table.className = "tooltip-table";
    const table_body = document.createElement("tbody");
    rows.forEach(([label, value]) => {
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
    return table;
}

//Table with an optional header row and an optional total row at the bottom
function buildDataTable({ head, rows, foot }) {
    const table = document.createElement("table");
    table.className = "tooltip-table tooltip-data-table";

    function addRow(parent, cells, cell_tag, row_class) {
        const row = document.createElement("tr");
        if (row_class) row.className = row_class;
        cells.forEach((cell, index) => {
            const element = document.createElement(cell_tag);
            element.className = index === 0 ? "tooltip-cell-label" : "tooltip-cell-value";
            element.innerHTML = cell;
            row.appendChild(element);
        });
        parent.appendChild(row);
    }

    if (head) {
        const table_head = document.createElement("thead");
        addRow(table_head, head, "th");
        table.appendChild(table_head);
    }
    const table_body = document.createElement("tbody");
    (rows ?? []).forEach((cells) => addRow(table_body, cells, "td"));
    if (foot) addRow(table_body, foot, "td", "tooltip-total-row");
    table.appendChild(table_body);
    return table;
}

function buildSection(section) {
    const element = document.createElement("div");
    element.className = "tooltip-section";
    if (section.heading) element.appendChild(makeBlock("tooltip-section-heading", section.heading));
    if (section.rows && section.rows.length > 0) element.appendChild(buildTable(section.rows));
    if (section.table) element.appendChild(buildDataTable(section.table));
    (section.items ?? []).forEach(([name, text]) => {
        const item = document.createElement("div");
        item.className = "tooltip-item";
        item.innerHTML = `<span class="tooltip-item-name">${name}</span>${text}`;
        element.appendChild(item);
    });
    return element;
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
    if (content.tag) fragment.appendChild(makeBlock("tooltip-tag", content.tag));
    if (content.rows && content.rows.length > 0) fragment.appendChild(buildTable(content.rows));
    (content.sections ?? []).forEach((section) => fragment.appendChild(buildSection(section)));
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