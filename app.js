const stage = new Konva.Stage({
  container: "container",
  width: window.innerWidth,
  height: window.innerHeight,
});

const layer = new Konva.Layer();
stage.add(layer);

const seatGroups = [];
let curvaturePercent = 1.0; // Initialize to 100 (default value)

const transformer = new Konva.Transformer({
  nodes: [],
  enabledAnchors: ["top-left", "top-right", "bottom-left", "bottom-right"],
  rotateEnabled: true,
  borderStroke: "blue",
  anchorStroke: "blue",
  anchorFill: "white",
  anchorSize: 8,
});
layer.add(transformer);

let selectionRect = null;
let isSelecting = false;
let startPos = { x: 0, y: 0 };

function isEventOverControls(e) {
  const controls = document.getElementById("controls");
  const rect = controls.getBoundingClientRect();
  const pos = stage.getPointerPosition();
  return (
    pos.x >= rect.left &&
    pos.x <= rect.right &&
    pos.y >= rect.top &&
    pos.y <= rect.bottom
  );
}

//let isSelecting = false;
let startAngle = 0;
let endAngle = 0;
//let startPos = null;
let arcSelector = null;

stage.on("mousedown touchstart", (e) => {
  if (e.target === stage && !isEventOverControls(e)) {
    isSelecting = true;
    startPos = stage.getPointerPosition();

    arcSelector = new Konva.Arc({
      x: startPos.x,
      y: startPos.y,
      innerRadius: 0,
      outerRadius: 500, // max radius you want
      angle: 0,
      rotation: 0,
      fill: "rgba(0, 0, 255, 0.3)",
      stroke: "blue",
      strokeWidth: 1,
    });

    layer.add(arcSelector);
    transformer.nodes([]);
    layer.batchDraw();
  }
});

stage.on("mousemove touchmove", (e) => {
  if (!isSelecting || !arcSelector) return;

  const pointerPos = stage.getPointerPosition();
  const dx = pointerPos.x - startPos.x;
  const dy = pointerPos.y - startPos.y;
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

  endAngle = angle;
  let rotation = (startAngle + endAngle) / 2;
  let span = Math.abs(endAngle - startAngle);

  arcSelector.rotation(startAngle); // Start angle defines the rotation
  arcSelector.angle(span); // Span of the arc
  layer.batchDraw();
});

stage.on("mouseup touchend", (e) => {
  if (!isSelecting || !arcSelector || isEventOverControls(e)) return;

  isSelecting = false;

  const centerX = arcSelector.x();
  const centerY = arcSelector.y();
  const outerRadius = arcSelector.outerRadius();
  const innerRadius = arcSelector.innerRadius();
  const angle = arcSelector.angle();
  const rotation = arcSelector.rotation(); // start angle in degrees

  const seatRadius = 15;
  const seatSpacing = 10;
  const seatDiameter = seatRadius * 2 + seatSpacing;

  const sectionGroup = new Konva.Group({
    draggable: true,
  });

  sectionGroup.isCurved = true;
  sectionGroup.centerX = centerX;
  sectionGroup.centerY = centerY;
  sectionGroup.seats = [];
  sectionGroup.originalSeats = [];

  const startRadius = innerRadius + seatRadius;
  const endRadius = outerRadius - seatRadius;

  // Step between concentric rings
  for (let r = startRadius; r <= endRadius; r += seatDiameter) {
    const arcLength = Math.PI * 2 * r * (angle / 360); // arc length at radius r
    const numSeats = Math.floor(arcLength / seatDiameter);
    const angleStep = angle / numSeats;

    for (let i = 0; i < numSeats; i++) {
      const seatAngleDeg = rotation + i * angleStep + angleStep / 2;
      const seatAngleRad = (seatAngleDeg * Math.PI) / 180;

      const x = centerX + r * Math.cos(seatAngleRad);
      const y = centerY + r * Math.sin(seatAngleRad);

      const seat = new Konva.Circle({
        x,
        y,
        radius: seatRadius,
        fill: "#008080",
        stroke: "black",
        strokeWidth: 1,
      });

      const seatNumber = `${Math.floor(x)}, ${Math.floor(y)}`;
      const label = new Konva.Text({
        x,
        y,
        text: seatNumber,
        fontSize: 12,
        fontFamily: "Arial",
        fill: "white",
        align: "center",
        verticalAlign: "middle",
        width: seatRadius * 2,
        height: seatRadius * 2,
        offsetX: seatRadius,
        offsetY: seatRadius,
      });

      sectionGroup.add(seat, label);
      const seatData = {
        seat,
        label,
        radius: r,
        angle: seatAngleDeg,
        originalX: x,
        originalY: y,
      };
      sectionGroup.seats.push(seatData);
      sectionGroup.originalSeats.push(seatData);
    }
  }

  sectionGroup.on("click tap", (e) => {
    if (!isEventOverControls(e)) {
      e.cancelBubble = true;
      transformer.nodes([sectionGroup]);
      layer.batchDraw();
    }
  });

  seatGroups.push(sectionGroup);
  layer.add(sectionGroup);

  arcSelector.destroy();
  arcSelector = null;
  layer.batchDraw();
});

// stage.on("mouseup touchend", (e) => {
//   if (!isSelecting || isEventOverControls(e)) return;
//   isSelecting = false;

//   const box = selectionRect.getClientRect();

//   const seatRadius = 15;
//   const seatSpacing = 10;
//   const seatDiameter = seatRadius * 2 + seatSpacing;

//   const cols = Math.floor(box.width / seatDiameter);
//   const rows = Math.floor(box.height / seatDiameter);

//   const sectionGroup = new Konva.Group({
//     draggable: true,
//     isCurved: false,
//     centerX: box.x + box.width / 2,
//     centerY: box.y + box.height / 2,
//     seats: [],
//     originalSeats: [], // Store original grid seats
//   });

//   if (cols > 0 && rows > 0) {
//     const startX = box.x + seatRadius + seatSpacing / 2;
//     const startY = box.y + seatRadius + seatSpacing / 2;

//     sectionGroup.seats = [];
//     sectionGroup.originalSeats = [];

//     for (let row = 0; row < rows; row++) {
//       for (let col = 0; col < cols; col++) {
//         const x = startX + col * seatDiameter;
//         const y = startY + row * seatDiameter;
//         const seat = new Konva.Circle({
//           x: x,
//           y: y,
//           radius: seatRadius,
//           fill: "#008080",
//           stroke: "black",
//           strokeWidth: 1,
//         });

//         const seatNumber = `${Math.floor(x)}, ${Math.floor(y)}`;
//         const label = new Konva.Text({
//           x: x,
//           y: y,
//           text: seatNumber,
//           fontSize: 12,
//           fontFamily: "Arial",
//           fill: "white",
//           align: "center",
//           verticalAlign: "middle",
//           width: seatRadius * 2,
//           height: seatRadius * 2,
//           offsetX: seatRadius,
//           offsetY: seatRadius,
//         });

//         sectionGroup.add(seat, label);
//         const seatData = { seat, label, row, col, originalX: x, originalY: y };
//         sectionGroup.seats.push(seatData);
//         sectionGroup.originalSeats.push(seatData);
//       }
//     }

//     sectionGroup.on("click tap", (e) => {
//       if (!isEventOverControls(e)) {
//         e.cancelBubble = true;
//         transformer.nodes([sectionGroup]);
//         layer.batchDraw();
//       }
//     });

//     seatGroups.push(sectionGroup);
//     layer.add(sectionGroup);
//   }

//   selectionRect.destroy();
//   layer.batchDraw();
// });

stage.on("click tap", (e) => {
  if (e.target === stage && !isEventOverControls(e)) {
    transformer.nodes([]);
    layer.batchDraw();
  }
});

window.addEventListener("resize", () => {
  stage.width(window.innerWidth);
  stage.height(window.innerHeight);
  layer.batchDraw();
});

document.getElementById("toggle-curve").addEventListener("click", () => {
  const selectedGroup = transformer.nodes()[0];
  if (selectedGroup) {
    selectedGroup.setAttr("isCurved", !selectedGroup.getAttr("isCurved"));
    updateSeatPositions(selectedGroup);
    layer.batchDraw();
  }
});

document.getElementById("curvature-slider").addEventListener("input", (e) => {
  curvaturePercent = (e.target.value - 50) / 100; // Map 50-200 to 0.5-2.0
  document.getElementById(
    "curvature-label"
  ).textContent = `Curvature: ${e.target.value}%`;
  const selectedGroup = transformer.nodes()[0];
  if (selectedGroup && selectedGroup.getAttr("isCurved")) {
    updateSeatPositions(selectedGroup);
    layer.batchDraw();
  }
});

function updateSeatPositions(group) {
  const seatRadius = 15;
  const seatSpacing = 10;
  const seatDiameter = seatRadius * 2 + seatSpacing;
  const centerX = group.getAttr("centerX");
  const centerY = group.getAttr("centerY");

  // Clear all existing children
  group.getChildren().forEach((child) => child.destroy());
  // Clear the seats array
  group.seats = [];

  const rows =
    group.originalSeats.length > 0
      ? Math.max(...group.originalSeats.map((s) => s.row)) + 1
      : 0;
  const cols =
    group.originalSeats.length > 0
      ? Math.max(...group.originalSeats.map((s) => s.col)) + 1
      : 0;

  if (!group.getAttr("isCurved")) {
    // Grid layout: restore original seats
    group.originalSeats.forEach((seatData) => {
      const { row, col, originalX, originalY } = seatData;
      const x = originalX;
      const y = originalY;

      const seat = new Konva.Circle({
        x: x,
        y: y,
        radius: seatRadius,
        fill: "#008080",
        stroke: "black",
        strokeWidth: 1,
      });

      const seatNumber = `${Math.floor(x)}, ${Math.floor(y)}`;
      const label = new Konva.Text({
        x: x,
        y: y,
        text: seatNumber,
        fontSize: 12,
        fontFamily: "Arial",
        fill: "white",
        align: "center",
        verticalAlign: "middle",
        width: seatRadius * 2,
        height: seatRadius * 2,
        offsetX: seatRadius,
        offsetY: seatRadius,
      });

      group.add(seat, label);
      group.seats.push({ seat, label, row, col, originalX, originalY });
    });
  } else {
    // Curved layout: create arcs with seat count adjusted by curvature=
    const baseSeatCount = cols;
    for (let row = 0; row < rows; row++) {
      const seatCount = Math.floor(baseSeatCount + row * 2 * curvaturePercent);
      const radius = 100 + row * 35 * curvaturePercent;
      const seatArcLength = seatRadius * 2 + seatSpacing;
      const totalArcLength = seatCount * seatArcLength;
      const totalAngle = seatCount > 0 ? totalArcLength / radius : 0;
      const baseAngle = -Math.PI / 2;
      const startAngle = baseAngle - totalAngle / 2;
      const angleStep =
        seatCount > 1 ? totalArcLength / (seatCount - 1) / radius : 0;

      for (let col = 0; col < seatCount; col++) {
        const angle = startAngle + col * angleStep;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);

        const seat = new Konva.Circle({
          x: x,
          y: y,
          radius: seatRadius,
          fill: "#008080",
          stroke: "black",
          strokeWidth: 1,
        });

        const seatNumber = `${Math.floor(x)}, ${Math.floor(y)}`;
        const label = new Konva.Text({
          x: x,
          y: y,
          text: seatNumber,
          fontSize: 12,
          fontFamily: "Arial",
          fill: "white",
          align: "center",
          verticalAlign: "middle",
          width: seatRadius * 2,
          height: seatRadius * 2,
          offsetX: seatRadius,
          offsetY: seatRadius,
        });

        group.add(seat, label);
        // Use original seat data if available, else use curved position
        const originalSeat = group.originalSeats.find(
          (s) => s.row === row && s.col === col
        );
        group.seats.push({
          seat,
          label,
          row,
          col,
          originalX: originalSeat ? originalSeat.originalX : x,
          originalY: originalSeat ? originalSeat.originalY : y,
        });
      }
    }
  }

  // Redraw the layer
  layer.batchDraw();
}

function createArcSeatGroup(options) {
  const {
    centerX,
    centerY,
    radius = 150,
    seatCount = 10,
    seatRadius = 15,
    seatSpacing = 10,
    startAngle = null,
  } = options;

  const group = new Konva.Group({
    x: 0,
    y: 0,
    draggable: true,
    isCurved: true,
    centerX,
    centerY,
    seats: [],
    originalSeats: [],
  });

  const seatArcLength = seatRadius * 2 + seatSpacing;
  const totalArcLength = seatCount * seatArcLength;
  const totalAngle = totalArcLength / radius;
  const baseAngle = -Math.PI / 2;
  const effectiveStartAngle = startAngle ?? baseAngle - totalAngle / 2;
  const angleStep =
    seatCount > 1 ? totalArcLength / (seatCount - 1) / radius : 0;

  for (let i = 0; i < seatCount; i++) {
    const angle = effectiveStartAngle + i * angleStep;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);

    const seat = new Konva.Circle({
      x: x,
      y: y,
      radius: seatRadius,
      fill: "#008080",
      stroke: "black",
      strokeWidth: 1,
    });

    const seatNumber = `${Math.floor(x)}, ${Math.floor(y)}`;
    const label = new Konva.Text({
      x: x,
      y: y,
      text: seatNumber,
      fontSize: 12,
      fontFamily: "Arial",
      fill: "white",
      align: "center",
      verticalAlign: "middle",
      width: seatRadius * 2,
      height: seatRadius * 2,
      offsetX: seatRadius,
      offsetY: seatRadius,
    });

    group.add(seat, label);
    const seatData = {
      seat,
      label,
      row: 0,
      col: i,
      originalX: x,
      originalY: y,
    };
    group.seats.push(seatData);
    group.originalSeats.push(seatData);
  }

  return group;
}

function createFiveArcs() {
  for (let i = 0; i < 6; i++) {
    const arcGroup = createArcSeatGroup({
      centerX: 400,
      centerY: 400,
      radius: 150 + i * 35,
      seatCount: 2 + i * 2,
      seatRadius: 15,
      seatSpacing: 10,
    });
    layer.add(arcGroup);
    seatGroups.push(arcGroup);
  }
}
// createFiveArcs();

layer.draw();

//***************************************************** */

// Keep track of the currently selected table group
let selectedGroup = null;
let globalTransformer; // Single transformer for the layer

// Initialize the global transformer
function initTransformer() {
  globalTransformer = new Konva.Transformer({
    nodes: [],
    rotateEnabled: true,
    resizeEnabled: true,
    enabledAnchors: ["top-left", "top-right", "bottom-left", "bottom-right"],
    // boundBoxFunc is important to prevent scaling to zero or negative
    boundBoxFunc: (oldBox, newBox) => {
      if (newBox.width < 20 || newBox.height < 20) {
        return oldBox;
      }
      return newBox;
    },
  });
  tableLayer.add(globalTransformer);
}
initTransformer();

// --- Event Handlers ---
function buttonClickEventHandler() {
  // Clear existing tables before creating new ones to avoid overlap and ID conflicts
  // tableLayer.destroyChildren(); // This would also destroy the transformer
  // initTransformer(); // Re-initialize transformer if layer children are destroyed

  // A safer way is to remove groups and their transformers one by one if needed,
  // or ensure unique IDs if adding more tables. For this demo, let's assume fresh creation.
  // If you want to add more tables without clearing, ensure unique IDs.

  createTable({
    id: "CircleTable1",
    type: "circle",
    x: 200,
    y: 200,
    width: 120, // Diameter
    rotation: 0,
    seatCount: 6,
  });

  createTable({
    id: "SquareTable1",
    type: "square",
    x: 500,
    y: 180,
    width: 100, // Side length
    height: 100, // Side length
    rotation: 0,
    seatsPerSide: { top: 2, bottom: 2, left: 2, right: 2 },
  });

  createTable({
    id: "RectTable1",
    type: "rectangle",
    x: 800,
    y: 250,
    width: 180,
    height: 90,
    rotation: 0,
    seatsPerSide: { top: 3, bottom: 3, left: 1, right: 1 },
  });
}

/**
 * Adds a new chair to the right side of the selected rectangular/square table.
 */
function addChair() {
  if (!selectedGroup) {
    console.warn("Please select a table first!");
    document.getElementById("selected-table-info").textContent =
      "Please select a table first!";
    return;
  }

  const tableShape = selectedGroup.findOne("Rect"); // Only works for Rect tables
  if (!tableShape) {
    console.warn("Chair can only be added to a rectangular or square table.");
    document.getElementById("selected-table-info").textContent =
      "Selected table is not rectangular/square.";
    return;
  }

  const chairSpaceWidth = 40; // The additional width needed for one chair + spacing
  const seatRadius = 12;

  const currentWidth = tableShape.width();
  const newWidth = currentWidth + chairSpaceWidth;

  // Update table shape's width and its offsetX to keep it centered
  tableShape.width(newWidth);
  tableShape.offsetX(newWidth / 2);

  // Calculate position for the new seat
  // The new seat is placed in the center of the newly added width segment on the right
  const newSeatX = currentWidth / 2 + chairSpaceWidth / 2; // Relative to group center
  const newSeatY = 0; // Vertically centered relative to group center

  // Determine the new seat number
  const seats = selectedGroup.find("Circle").filter((c) => c.getAttr("isSeat"));
  const newSeatNumber = seats.length + 1;

  addSeatToGroup(
    selectedGroup,
    newSeatX,
    newSeatY,
    seatRadius,
    newSeatNumber,
    true
  );

  // Update transformer
  globalTransformer.nodes([selectedGroup]); // Ensure transformer is attached
  globalTransformer.forceUpdate(); // Force update to reflect new size

  tableLayer.batchDraw();
  console.log(`Added chair to ${selectedGroup.id()}. New width: ${newWidth}`);
  document.getElementById(
    "selected-table-info"
  ).textContent = `Added chair to ${selectedGroup.id()}.`;
}

// --- Core Table and Seat Creation Functions ---

function createTable(config) {
  const { id, type, x, y, width, height, rotation } = config;

  const group = new Konva.Group({
    id: id,
    x: x,
    y: y,
    rotation: rotation,
    draggable: true,
  });

  let tableShape; // The main table shape (circle or rect)

  if (type === "circle") {
    const radius = width / 2;
    tableShape = new Konva.Circle({
      radius: radius,
      fill: "lightgrey",
      stroke: "black",
      strokeWidth: 2,
      // Circles are already centered by default if x,y are 0 in group
    });
    group.add(tableShape);
    setLabel(group, 0, 0, id); // Label at the center of the group
    addSeatsAroundCircle(group, tableShape, config.seatCount || 8);
  } else if (type === "rectangle" || type === "square") {
    tableShape = new Konva.Rect({
      width: width,
      height: height,
      fill: "lightgrey",
      stroke: "black",
      strokeWidth: 2,
      offsetX: width / 2, // Center the origin
      offsetY: height / 2, // Center the origin
    });
    group.add(tableShape);
    setLabel(group, 0, 0, id); // Label at the center of the group
    addInitialSeatsForRectangle(group, tableShape, config.seatsPerSide);
  } else {
    console.error("Invalid table type:", type);
    return;
  }

  tableLayer.add(group);

  // Handle selection and transformer attachment
  group.on("click tap", () => {
    selectedGroup = group;
    globalTransformer.nodes([group]);
    // For squares that become rectangles, ensure keepRatio is false
    if (
      group.findOne("Rect") &&
      globalTransformer.keepRatio() &&
      tableShape.width() !== tableShape.height()
    ) {
      globalTransformer.keepRatio(false);
    } else if (
      type === "circle" ||
      (type === "square" && tableShape.width() === tableShape.height())
    ) {
      globalTransformer.keepRatio(true);
    }

    tableLayer.batchDraw(); // Redraw layer to show transformer
    console.log(`Selected: ${group.id()}`);
    document.getElementById(
      "selected-table-info"
    ).textContent = `Selected: ${group.id()}`;
  });

  // When a group is dragged, update its transformer
  group.on("dragmove", () => {
    if (selectedGroup === group) {
      globalTransformer.forceUpdate();
    }
  });

  // If it's the first table or by some logic, make it selected
  if (!selectedGroup) {
    selectedGroup = group;
    globalTransformer.nodes([group]);
    if (type === "circle" || type === "square")
      globalTransformer.keepRatio(true);
    else globalTransformer.keepRatio(false);
    document.getElementById(
      "selected-table-info"
    ).textContent = `Selected: ${group.id()}`;
  }

  tableLayer.batchDraw();
}

/**
 * Adds a single seat (circle and label) to a group.
 * @param {Konva.Group} group The group to add the seat to.
 * @param {number} x X-coordinate of the seat relative to the group.
 * @param {number} y Y-coordinate of the seat relative to the group.
 * @param {number} radius Radius of the seat.
 * @param {number} number The seat number for the label.
 * @param {boolean} isSeat Mark this circle as a seat.
 */
function addSeatToGroup(group, x, y, radius, number, isSeat = true) {
  const seat = new Konva.Circle({
    x: x,
    y: y,
    radius: radius,
    fill: "#008080", // Teal color for seats
    stroke: "black",
    strokeWidth: 1,
  });
  if (isSeat) {
    seat.setAttr("isSeat", true); // Custom attribute to identify seats
    seat.setAttr("seatNumber", number);
  }
  group.add(seat);

  const label = new Konva.Text({
    x: x,
    y: y,
    text: number.toString(),
    fontSize: radius * 0.8, // Adjust font size based on seat radius
    fill: "white",
    listening: false, // Don't let labels interfere with clicks
  });
  label.offsetX(label.width() / 2);
  label.offsetY(label.height() / 2);
  group.add(label);
}

/**
 * Adds seats around a circular table.
 * @param {Konva.Group} group The group containing the table.
 * @param {Konva.Circle} tableShape The circular table shape.
 * @param {number} seatCount Number of seats.
 */
function addSeatsAroundCircle(group, tableShape, seatCount) {
  const tableRadius = tableShape.radius();
  const seatOffsetFromTable = 15; // Distance from table edge to seat center
  const seatRadius = 12;
  const effectiveRadius = tableRadius + seatOffsetFromTable; // Radius for seat positioning circle
  const angleStep = 360 / seatCount;

  for (let i = 0; i < seatCount; i++) {
    const angleDeg = i * angleStep;
    const angleRad = Konva.getAngle(angleDeg); // Konva.getAngle converts deg to rad
    const localX = effectiveRadius * Math.cos(angleRad);
    const localY = effectiveRadius * Math.sin(angleRad);
    addSeatToGroup(group, localX, localY, seatRadius, i + 1, true);
  }
}

/**
 * Adds initial seats around a rectangular/square table.
 * @param {Konva.Group} group The group containing the table.
 * @param {Konva.Rect} tableShape The rectangular table shape.
 * @param {object} seatsPerSide E.g., {top: 2, bottom: 2, left: 1, right: 1}.
 */
function addInitialSeatsForRectangle(group, tableShape, seatsPerSide) {
  const width = tableShape.width();
  const height = tableShape.height();
  const seatRadius = 12;
  const seatOffsetFromTable = 20; // Distance from table edge to seat center
  let seatNumber = 1;

  // Table's origin is centered (offsetX/Y), so its edges are at +/- width/2 and +/- height/2
  // Top seats
  const topY = -height / 2 - seatOffsetFromTable;
  for (let i = 0; i < (seatsPerSide.top || 0); i++) {
    const topX = -width / 2 + (width / ((seatsPerSide.top || 1) + 1)) * (i + 1);
    addSeatToGroup(group, topX, topY, seatRadius, seatNumber++, true);
  }
  // Bottom seats
  const bottomY = height / 2 + seatOffsetFromTable;
  for (let i = 0; i < (seatsPerSide.bottom || 0); i++) {
    const bottomX =
      -width / 2 + (width / ((seatsPerSide.bottom || 1) + 1)) * (i + 1);
    addSeatToGroup(group, bottomX, bottomY, seatRadius, seatNumber++, true);
  }
  // Left seats
  const leftX = -width / 2 - seatOffsetFromTable;
  for (let i = 0; i < (seatsPerSide.left || 0); i++) {
    const leftY =
      -height / 2 + (height / ((seatsPerSide.left || 1) + 1)) * (i + 1);
    addSeatToGroup(group, leftX, leftY, seatRadius, seatNumber++, true);
  }
  // Right seats
  const rightX = width / 2 + seatOffsetFromTable;
  for (let i = 0; i < (seatsPerSide.right || 0); i++) {
    const rightY =
      -height / 2 + (height / ((seatsPerSide.right || 1) + 1)) * (i + 1);
    addSeatToGroup(group, rightX, rightY, seatRadius, seatNumber++, true);
  }
}

/**
 * Sets a label at the center of a group.
 */
function setLabel(group, x, y, labelText) {
  const label = new Konva.Text({
    x: x,
    y: y,
    text: labelText.toString(),
    fontSize: 12,
    fill: "black",
    listening: false, // Labels should not block clicks on the table
  });
  label.offsetX(label.width() / 2);
  label.offsetY(label.height() / 2);
  group.add(label);
}

// Adjust stage size on window resize
window.addEventListener("resize", () => {
  stage.width(window.innerWidth);
  stage.height(window.innerHeight);
  tableLayer.batchDraw();
});

// Initial call to create some tables
buttonClickEventHandler();
