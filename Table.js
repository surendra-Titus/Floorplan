const seatRadius = 12;
const stage = new Konva.Stage({
  container: "container",
  width: window.innerWidth,
  height: window.innerHeight,
});

let backgroundLayer = new Konva.Layer({ name: "background" });
stage.add(backgroundLayer);

let tableLayer = new Konva.Layer({ name: "table" });
stage.add(tableLayer);

let selectedGroup = null;
let globalTransformer;

const generateTableNo = tableNoGenerator();

document.addEventListener("DOMContentLoaded", function () {
  initTransformer();
  //loadFloorPlanFromLocalStorage();
});

function initTransformer() {
  globalTransformer = new Konva.Transformer({
    nodes: [],
    rotateEnabled: true,
    resizeEnabled: true,
    enabledAnchors: ["top-left", "top-right", "bottom-left", "bottom-right"],
    // boundBoxFunc is important to prevent scaling to zero or negative
    boundBoxFunc: (oldBox, newBox) => {
      const minWidth = 50;
      const minHeight = 50;

      if (newBox.width < minWidth || newBox.height < minHeight) {
        return oldBox;
      }

      return newBox;
    },
  });
  tableLayer.add(globalTransformer);
  globalTransformer.on("transform", handleGlobalTransform);
}

function handleGlobalTransform() {
  if (!selectedGroup) return;

  if (selectedGroup.getAttr("tableType")) {
    const tableShape =
      selectedGroup.findOne("Rect") ||
      selectedGroup.findOne("Ellipse") ||
      selectedGroup.findOne("Circle");
    if (!tableShape) return;
    const previousSeatStates = getSeatAvailabilityMap(selectedGroup);
    const seatRad = getSeatRadiusOfSeat(selectedGroup);
    if (tableShape.getClassName() === "Rect") {
      const seatsPerSide = selectedGroup.getAttr("seatsPerSide");
      removeAllSeats(selectedGroup);
      addInitialSeatsForRectangle(
        selectedGroup,
        tableShape,
        seatsPerSide,
        previousSeatStates,
        seatRad
      );
    } else if (tableShape.getClassName() === "Circle") {
      const seatCount = selectedGroup.getAttr("seatCount");
      removeAllSeats(selectedGroup);
      addSeatsAroundCircle(
        selectedGroup,
        tableShape,
        seatCount,
        previousSeatStates,
        seatRad
      );
    } else if (tableShape.getClassName().toLowerCase() === "Ellipse") {
      const seatCount = selectedGroup.getAttr("seatCount");
      removeAllSeats(selectedGroup);
      addSeatsAroundOval(
        selectedGroup,
        tableShape,
        seatCount,
        previousSeatStates
      );
    }

    selectedGroup.find("Text").forEach((textNode) => {
      const scaleFactor = 1 / selectedGroup.scaleX();
      const baseFontSize = 8;

      textNode.fontSize(baseFontSize * scaleFactor);

      textNode.offsetX(textNode.width() / 2);
      textNode.offsetY(textNode.height() / 2);
    });
  }

  selectedGroup.find("Image").forEach((icon) => {
    const scaleFactor = selectedGroup.scaleX();

    const baseIconSize = 20;
    icon.width(baseIconSize * scaleFactor);
    icon.height(baseIconSize * scaleFactor);
    icon.offsetX(icon.width() / 2);
    icon.offsetY(icon.height() / 2);
  });

  tableLayer.batchDraw();

  if (backgroundLayer.getChildren().length > 0) {
    backgroundLayer.batchDraw();
  }
}

function buttonClickEventHandler(e) {
  const { x, y } = stage.getPointerPosition() ?? {};
  if (e.type === "circle") {
    createTable({
      id: generateTableNo.next().value.toString(),
      type: "circle",
      x: 200,
      y: 200,
      width: 120,
      rotation: 0,
      seatCount: 8,
    });
  } else if (e.type === "oval") {
    createTable({
      id: generateTableNo.next().value.toString(),
      type: "oval",
      x: x || 200,
      y: y || 200,
      width: 150,
      height: 100,
      rotation: 0,
      seatCount: 8,
    });
  } else if (e.type === "rectangle") {
    createTable({
      id: generateTableNo.next().value.toString(),
      type: "rectangle",
      x: x || 800,
      y: y || 250,
      width: 180,
      height: 90,
      rotation: 0,
      seatsPerSide: { top: 3, bottom: 3, left: 2, right: 2 },
    });
  }
}

function createTable(config) {
  const { id, type, x, y, width, height, rotation, label, seats = [] } = config;
  const tblLabel = label || id;
  const seatAvailabilityMap = {};
  seats.forEach((seat) => {
    seatAvailabilityMap[seat.seatNumber] = seat.isAvailable;
  });

  const group = new Konva.Group({
    id: id,
    x: x,
    y: y,
    rotation: rotation,
    draggable: true,
  });

  group.setAttr("tableType", type);

  if (type === "circle" || type === "oval") {
    group.setAttr("seatCount", config.seatCount || 8);
  } else if (type === "rectangle" || type === "square") {
    group.setAttr(
      "seatsPerSide",
      config.seatsPerSide || { top: 0, bottom: 0, left: 0, right: 0 }
    );
  }

  let tableShape;

  if (type === "circle") {
    const radius = width / 2;
    tableShape = new Konva.Circle({
      radius: radius,
      fill: "white",
      stroke: "lightgrey",
      strokeWidth: 1,
    });
    group.add(tableShape);
    setLabel(group, 0, 0, tblLabel);
    addSeatsAroundCircle(
      group,
      tableShape,
      group.getAttr("seatCount"),
      seatAvailabilityMap,
      seats[0]?.radius
    );
  } else if (type === "oval") {
    const radiusX = width / 2;
    const radiusY = height / 2;
    tableShape = new Konva.Ellipse({
      radiusX: radiusX,
      radiusY: radiusY,
      fill: "white",
      stroke: "lightgrey",
      strokeWidth: 1,
    });
    group.add(tableShape);
    setLabel(group, 0, 0, tblLabel);
    addSeatsAroundOval(
      group,
      tableShape,
      group.getAttr("seatCount"),
      seatAvailabilityMap,
      seats[0]?.radiusX,
      seats[0]?.radiusY,
      seats[0]?.radius
    );
  } else if (type === "rectangle" || type === "square") {
    tableShape = new Konva.Rect({
      width: width,
      height: height,
      fill: "white",
      stroke: "lightgrey",
      strokeWidth: 1,
      //offsetX: width / 2,
      //offsetY: height / 2,
      cornerRadius: 10,
      tableType: type,
    });
    group.add(tableShape);
    setLabel(group, width / 2, height / 2, tblLabel);
    addInitialSeatsForRectangle(
      group,
      tableShape,
      group.getAttr("seatsPerSide"),
      seatAvailabilityMap,
      seats[0]?.radius
    );
  } else {
    console.error("Invalid table type:", type);
    return;
  }

  tableLayer.add(group);

  group.on("click tap", () => {
    selectedGroup = group;
    globalTransformer.nodes([group]);

    if (group.findOne("Rect") && tableShape.width() !== tableShape.height()) {
      globalTransformer.keepRatio(false);
    } else if (type === "circle" || type === "oval") {
      globalTransformer.keepRatio(true);
    }

    tableLayer.batchDraw();
    const tblShape = tableShape?.getClassName();

    if (tableShape.getClassName() === "Rect") {
      const seatsPerSide = group.getAttr("seatsPerSide");
      document.querySelector("#input-top").value = seatsPerSide.top || "";
      document.querySelector("#input-right").value = seatsPerSide.right || "";
      document.querySelector("#input-bottom").value = seatsPerSide.bottom || "";
      document.querySelector("#input-left").value = seatsPerSide.left || "";
      document.querySelector("#input-tableNo").value =
        selectedGroup.findOne("Text").text() || "";
    } else if (
      tblShape?.toLowerCase() === "circle" ||
      tblShape?.toLowerCase() === "oval"
    ) {
      resetSeatsCount();
      document.querySelector("#input-tableNo").value =
        selectedGroup.findOne("Text").text() || "";
    } else {
      resetSeatsCount();
    }
  });

  group.on("dragmove", () => {
    if (selectedGroup === group) {
      globalTransformer.forceUpdate();
    }
  });

  if (!selectedGroup) {
    selectedGroup = group;
    globalTransformer.nodes([group]);
    if (type === "circle" || type === "oval") {
      globalTransformer.keepRatio(true);
    } else {
      globalTransformer.keepRatio(false);
    }
  }

  tableLayer.batchDraw();
}

function addSeatToGroup(group, x, y, radius, number, seatSide, state = true) {
  const seatColors = {
    available: "#008080",
    unavailable: "#808080",
  };

  const seat = new Konva.Circle({
    x: x,
    y: y,
    radius: radius,
    fill: state ? seatColors.available : seatColors.unavailable,
    stroke: "white",
    strokeWidth: 1,
    name: `seat ${number}`,
    className: "seat",
    seatNumber: number,
    seatSide: seatSide,
    isAvailable: state,
    itemType: "seat",
  });
  group.add(seat);

  const label = new Konva.Text({
    x: x,
    y: y,
    text: number.toString(),
    fontSize: radius * 0.8,
    fill: "white",
    listening: false,
    name: `seat-label`,
    className: "seat-label",
  });
  label.offsetX(label.width() / 2);
  label.offsetY(label.height() / 2);
  group.add(label);

  seat.on("click", function () {
    toggleSeatAvailability(seat, seatColors);
  });

  seat.on("tap", function () {
    toggleSeatAvailability(seat, seatColors);
  });
}

function toggleSeatAvailability(seat, seatColors) {
  const currentState = seat.getAttr("isAvailable") ?? true;
  seat.setAttr("isAvailable", !currentState);
  const colorKey = !currentState ? "available" : "unavailable";
  seat.fill(seatColors[colorKey]);
  tableLayer.batchDraw();
}

function addSeatsAroundCircle(
  group,
  tableShape,
  seatCount,
  seatAvailabilityMap = {},
  seatRadius = 12
) {
  const tableRadius = tableShape.radius();
  //const seatOffsetFromTable = 15;
  const seatOffsetFromTable = Math.max(5, tableRadius * 0.25);

  const effectiveRadius = tableRadius + seatOffsetFromTable;
  const angleStep = 360 / seatCount;
  for (let i = 0; i < seatCount; i++) {
    const angleDeg = i * angleStep;
    const angleRad = Konva.getAngle(angleDeg);
    const localX = effectiveRadius * Math.cos(angleRad);
    const localY = effectiveRadius * Math.sin(angleRad);
    const isAvailable = seatAvailabilityMap[i + 1] !== false;
    addSeatToGroup(group, localX, localY, seatRadius, i + 1, "", isAvailable);
  }
}

function addSeatsAroundOval(
  group,
  tableShape,
  seatCount,
  seatAvailabilityMap = {},
  radiusX,
  radiusY,
  seatRadius = 12
) {
  radiusX = radiusX || tableShape.radiusX();
  radiusY = radiusY || tableShape.radiusY();
  //const seatOffsetFromTable = 15;
  const seatOffsetFromTableX = Math.max(5, radiusX * 0.25);
  const seatOffsetFromTableY = Math.max(5, radiusY * 0.25);
  const effectiveRadiusX = radiusX + seatOffsetFromTableX;
  const effectiveRadiusY = radiusY + seatOffsetFromTableY;
  const angleStep = 360 / seatCount;

  for (let i = 0; i < seatCount; i++) {
    const angleDeg = i * angleStep;
    const angleRad = Konva.getAngle(angleDeg);
    const localX = effectiveRadiusX * Math.cos(angleRad);
    const localY = effectiveRadiusY * Math.sin(angleRad);
    const isAvailable = seatAvailabilityMap[i + 1] !== false;
    addSeatToGroup(group, localX, localY, seatRadius, i + 1, "", isAvailable);
  }
}

function addInitialSeatsForRectangle(
  group,
  tableShape,
  seatsPerSide,
  seatAvailabilityMap = {},
  seatRadius = 12
) {
  const width = tableShape.width();
  const height = tableShape.height();
  const seatOffsetFromTable = 15;
  let seatNumber = 1;

  // Top seats
  //const topY = -height / 2 - seatOffsetFromTable;
  const topY = 0 - seatOffsetFromTable;
  for (let i = 0; i < (seatsPerSide.top || 0); i++) {
    //const topX = -width / 2 + (width / ((seatsPerSide.top || 0) + 1)) * (i + 1);
    const topX = (width / ((seatsPerSide.top || 0) + 1)) * (i + 1);
    const isAvailable = seatAvailabilityMap[seatNumber] !== false;
    addSeatToGroup(
      group,
      topX,
      topY,
      seatRadius,
      seatNumber++,
      "TOP",
      isAvailable
    );
  }

  // Right seats
  //const rightX = width / 2 + seatOffsetFromTable;
  const rightX = width + seatOffsetFromTable;
  for (let i = 0; i < (seatsPerSide.right || 0); i++) {
    // const rightY =
    //   -height / 2 + (height / ((seatsPerSide.right || 0) + 1)) * (i + 1);
    const rightY = (height / ((seatsPerSide.right || 0) + 1)) * (i + 1);
    const isAvailable = seatAvailabilityMap[seatNumber] !== false;
    addSeatToGroup(
      group,
      rightX,
      rightY,
      seatRadius,
      seatNumber++,
      "RIGHT",
      isAvailable
    );
  }

  // Bottom seats
  //const bottomY = height / 2 + seatOffsetFromTable;
  const bottomY = height + seatOffsetFromTable;
  for (let i = 0; i < (seatsPerSide.bottom || 0); i++) {
    // const bottomX =
    //   -width / 2 + (width / ((seatsPerSide.bottom || 0) + 1)) * (i + 1);
    const bottomX = (width / ((seatsPerSide.bottom || 0) + 1)) * (i + 1);
    const isAvailable = seatAvailabilityMap[seatNumber] !== false;
    addSeatToGroup(
      group,
      bottomX,
      bottomY,
      seatRadius,
      seatNumber++,
      "BOTTOM",
      isAvailable
    );
  }
  // Left seats
  //const leftX = -width / 2 - seatOffsetFromTable;
  const leftX = 0 - seatOffsetFromTable;
  for (let i = 0; i < (seatsPerSide.left || 0); i++) {
    // const leftY =
    //   -height / 2 + (height / ((seatsPerSide.left || 0) + 1)) * (i + 1);
    const leftY = (height / ((seatsPerSide.left || 0) + 1)) * (i + 1);
    const isAvailable = seatAvailabilityMap[seatNumber] !== false;
    addSeatToGroup(
      group,
      leftX,
      leftY,
      seatRadius,
      seatNumber++,
      "LEFT",
      isAvailable
    );
  }
}

function setLabel(group, x, y, labelText) {
  const existingLabel = group.findOne("Text");
  if (existingLabel) {
    existingLabel.destroy();
  }

  const label = new Konva.Text({
    x,
    y,
    text: labelText.toString(),
    fontSize: 8,
    fill: "black",
  });

  label.offsetX(label.width() / 2);
  label.offsetY(label.height() / 2);
  group.add(label);

  addIconToTableLabel("icons/flag.png", group, x, y);

  addTimerToTable(group, x, y, label);
}

function removeAllSeats(group) {
  const seatsState = [];

  group.find(".seat").forEach((seatNode) => {
    seatsState.push({
      seatNumber: seatNode.getAttr("seatNumber"),
      seatSide: seatNode.getAttr("seatSide"),
      isAvailable: seatNode.getAttr("isAvailable"),
    });
    seatNode.destroy();
  });
  //group.find(".seat").forEach((node) => node.destroy());
  group.find(".seat-label").forEach((node) => node.destroy());
}

function updateTableSeatsAndShape(
  group,
  newSeatsPerSide = null,
  newSeatCount = null
) {
  const tableShape = group.findOne("Rect") || group.findOne("Circle");
  if (!tableShape) return;

  const currentSeatsPerSide = group.getAttr("seatsPerSide") || {};
  const currentSeatCount = group.getAttr("seatCount");
  const tableType = tableShape.getClassName();

  let updatedSeatsPerSide = { ...currentSeatsPerSide };
  let updatedSeatCount = currentSeatCount;

  if (newSeatsPerSide) {
    updatedSeatsPerSide = { ...currentSeatsPerSide, ...newSeatsPerSide };
    group.setAttr("seatsPerSide", updatedSeatsPerSide);
  } else if (newSeatCount !== null) {
    updatedSeatCount = newSeatCount;
    group.setAttr("seatCount", updatedSeatCount);
  }

  removeAllSeats(group);

  const SEAT_RADIUS = 12;
  const MIN_TABLE_DIM_PER_SEAT_SPACING = SEAT_RADIUS * 2 + 10;
  const MIN_RECT_SIDE_LENGTH = 50;
  const SIDES_OFFSET = 5;

  let newWidth = tableShape.width();
  let newHeight = tableShape.height();

  if (tableType === "Rect") {
    const maxHorizontalSeats = Math.max(
      updatedSeatsPerSide.top || 0,
      updatedSeatsPerSide.bottom || 0
    );
    let requiredWidthForSeats =
      maxHorizontalSeats > 0
        ? maxHorizontalSeats * MIN_TABLE_DIM_PER_SEAT_SPACING
        : 0;

    newWidth = Math.max(requiredWidthForSeats, MIN_RECT_SIDE_LENGTH);

    const maxVerticalSeats = Math.max(
      updatedSeatsPerSide.left || 0,
      updatedSeatsPerSide.right || 0
    );
    let requiredHeightForSeats =
      maxVerticalSeats > 0
        ? maxVerticalSeats * MIN_TABLE_DIM_PER_SEAT_SPACING
        : 0;

    newHeight = Math.max(requiredHeightForSeats, MIN_RECT_SIDE_LENGTH);

    const widthWithOffset = newWidth + SIDES_OFFSET;
    const heightWithOffset = newHeight + SIDES_OFFSET;

    tableShape.width(widthWithOffset);
    tableShape.height(heightWithOffset);
    //tableShape.offsetX(newWidth / 2);
    //tableShape.offsetY(newHeight / 2);
    const label = group.findOne("Text");
    if (label) {
      label.x(widthWithOffset / 2);
      label.y(heightWithOffset / 2);
    }

    addInitialSeatsForRectangle(group, tableShape, updatedSeatsPerSide);
  } else if (tableType === "Circle") {
    addSeatsAroundCircle(group, tableShape, updatedSeatCount);
  }

  if (selectedGroup === group) {
    globalTransformer.nodes([group]);
    globalTransformer.forceUpdate();
  }

  tableLayer.batchDraw();
}

function onTableSeatsPerSideChange(value, side) {
  if (!selectedGroup) {
    console.warn("No table selected to change seats.");
    return;
  }

  const tableShape = selectedGroup.findOne("Rect");
  if (!tableShape) {
    console.warn("Selected table is not a rectangle/square.");
    return;
  }

  const currentSeatsPerSide = selectedGroup.getAttr("seatsPerSide");
  const newSeatsPerSide = {
    ...currentSeatsPerSide,
    [side]: parseInt(value) || 0,
  };

  updateTableSeatsAndShape(selectedGroup, newSeatsPerSide);
}

document.querySelector("#input-top").oninput = function () {
  onTableSeatsPerSideChange(this.value, "top");
};
document.querySelector("#input-right").oninput = function () {
  onTableSeatsPerSideChange(this.value, "right");
};
document.querySelector("#input-bottom").oninput = function () {
  onTableSeatsPerSideChange(this.value, "bottom");
};
document.querySelector("#input-left").oninput = function () {
  onTableSeatsPerSideChange(this.value, "left");
};
document.querySelector("#input-tableNo").oninput = function () {
  const newTableNo = this.value;

  if (!selectedGroup) return;

  const label = selectedGroup.findOne("Text");

  if (label) {
    label.text(newTableNo);

    label.offsetX(label.width() / 2);
    label.offsetY(label.height() / 2);

    tableLayer.batchDraw();
  } else {
    console.warn("No label found for the selected table.");
  }
};
document.querySelector("#input-seatCount").oninput = function () {
  const newSeatCount = parseInt(this.value) || 0;
  if (!selectedGroup) return;

  const tableShape =
    selectedGroup.findOne("Ellipse") || selectedGroup.findOne("Circle");
  if (!tableShape) return;

  selectedGroup.setAttr("seatCount", newSeatCount);
  removeAllSeats(selectedGroup);
  if (tableShape.getClassName() === "Circle") {
    addSeatsAroundCircle(selectedGroup, tableShape, newSeatCount);
  } else if (tableShape.getClassName() === "Ellipse") {
    addSeatsAroundOval(selectedGroup, tableShape, newSeatCount);
  }

  tableLayer.batchDraw();
};
function importImage(e) {
  document.getElementById("imageInput").click();
}

document.getElementById("imageInput").addEventListener("change", function (e) {
  const file = e.target.files[0];
  handleImageUpload(file);
});

function handleImageUpload(file, x = 0, y = 0) {
  if (file) {
    const reader = new FileReader();

    reader.onload = function (event) {
      const img = new Image();
      img.onload = function () {
        const konvaImage = new Konva.Image({
          x,
          y,
          image: img,
          width: img.width,
          height: img.height,
          draggable: true,
          name: "floorLayoutImage",
        });

        backgroundLayer.add(konvaImage);
        backgroundLayer.batchDraw();

        const stageWidth = stage.width();
        const stageHeight = stage.height();
        let scale = 1;
        if (img.width > stageWidth || img.height > stageHeight) {
          scale =
            Math.min(stageWidth / img.width, stageHeight / img.height) * 0.9;
          konvaImage.scaleX(scale);
          konvaImage.scaleY(scale);
        }

        konvaImage.x((stageWidth - img.width * scale) / 2);
        konvaImage.y((stageHeight - img.height * scale) / 2);

        konvaImage.on("click tap", () => {
          selectedGroup = konvaImage;
          globalTransformer.nodes([konvaImage]);
          globalTransformer.keepRatio(false);
          tableLayer.batchDraw();
          backgroundLayer.batchDraw();
        });

        if (!selectedGroup) {
          selectedGroup = konvaImage;
          globalTransformer.nodes([konvaImage]);
          globalTransformer.keepRatio(true);
        }

        konvaImage.on("dragmove", () => {
          if (selectedGroup === konvaImage) {
            globalTransformer.forceUpdate();
          }
        });
        backgroundLayer.batchDraw();
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  }
}

stage.on("wheel", function (e) {
  if (!e.evt.ctrlKey && !e.evt.metaKey) {
    return;
  }

  e.evt.preventDefault();
  const scaleBy = 1.5;
  const oldScale = stage.scaleX();
  const pointer = stage.getPointerPosition();
  const mousePointTo = {
    x: (pointer.x - stage.x()) / oldScale,
    y: (pointer.y - stage.y()) / oldScale,
  };

  let newScale = e.evt.deltaY > 0 ? oldScale * scaleBy : oldScale / scaleBy;
  newScale = Math.max(0.2, Math.min(3, newScale));

  stage.scale({ x: newScale, y: newScale });

  const newPos = {
    x: pointer.x - mousePointTo.x * newScale,
    y: pointer.y - mousePointTo.y * newScale,
  };
  stage.position(newPos);
  stage.batchDraw();
});

let lastDist = 0;
let lastCenter = null;

function getDistance(p1, p2) {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

function getCenter(p1, p2) {
  return {
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2,
  };
}

// Reset on touchstart
stage.on("touchstart", function () {
  lastDist = 0;
  lastCenter = null;
});

// Smooth pinch-to-zoom
stage.on("touchmove", function (e) {
  const touch1 = e.evt.touches?.[0];
  const touch2 = e.evt.touches?.[1];

  if (touch1 && touch2) {
    e.evt.preventDefault();

    const p1 = { x: touch1.clientX, y: touch1.clientY };
    const p2 = { x: touch2.clientX, y: touch2.clientY };

    const dist = getDistance(p1, p2);
    const center = getCenter(p1, p2);

    if (!lastDist || !lastCenter) {
      lastDist = dist;
      lastCenter = center;
      return;
    }

    // Zoom ratio (gentle zoom factor)
    const scaleBy = dist / lastDist;
    const oldScale = stage.scaleX();
    let newScale = oldScale * scaleBy;

    // Clamp zoom limits
    newScale = Math.max(0.5, Math.min(2.5, newScale));

    // Get pointer position relative to stage
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    // Apply zoom
    stage.scale({ x: newScale, y: newScale });

    // Keep the zoom centered around the gesture
    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };

    stage.position(newPos);
    stage.batchDraw();

    // Update for next frame
    lastDist = dist;
    lastCenter = center;
  }
});

stage.on("touchend", function () {
  lastDist = 0;
  lastCenter = null;
});

function resetStageView() {
  stage.scale({ x: 1, y: 1 });
  stage.position({ x: 0, y: 0 });
  stage.batchDraw();
}

function deleteSelected() {
  if (selectedGroup) {
    selectedGroup.destroy();
    globalTransformer.nodes([]);
    resetSeatsCount();
    tableLayer.batchDraw();
    backgroundLayer.batchDraw();
  }
}

function getFloorPlanData() {
  const floorPlan = { tables: [], layoutImage: null };

  tableLayer.find("Group").forEach((group) => {
    const tableShape =
      group.findOne("Ellipse") ||
      group.findOne("Circle") ||
      group.findOne("Rect");

    const tableId = group.id();
    if (!tableId) {
      return;
    }

    const tableData = {
      id: tableId,
      type: group.getAttr("tableType"),
      x: group.x(),
      y: group.y(),
      rotation: group.rotation(),
      scaleX: group.scaleX(),
      scaleY: group.scaleY(),
      seats: [],
    };

    const labelNode = group.findOne("Text");
    tableData.label = labelNode ? labelNode.text() : null;

    group.getChildren().forEach((child) => {
      const tableType = child.getClassName();
      if (tableType === "Rect") {
        tableData.width = child.width();
        tableData.height = child.height();
      }
    });

    if (tableData.type === "circle") {
      tableData.radius = tableShape.radius() * group.scaleX();
      tableData.seatCount = group.getAttr("seatCount");
    } else if (tableData.type === "oval") {
      tableData.radiusX = tableShape.radiusX() * group.scaleX();
      tableData.radiusY = tableShape.radiusY() * group.scaleY();
      tableData.seatCount = group.getAttr("seatCount");
    } else {
      tableData.width = tableData.width * group.scaleX();
      tableData.height = tableData.height * group.scaleY();
      tableData.seatsPerSide = group.getAttr("seatsPerSide");
    }

    group.find(".seat").forEach((seatNode) => {
      tableData.seats.push({
        seatNumber: seatNode.getAttr("seatNumber"),
        isAvailable: seatNode.getAttr("isAvailable"),
        radius: seatNode.radius() * group.scaleX(),
        //radiusX: tableShape?.radiusX() * group.scaleX(),
        //radiusY: tableShape?.radiusY() * group.scaleY(),
      });
      if (tableData.type === "oval") {
        tableData.seats[tableData.seats.length - 1].radiusX =
          tableShape.radiusX() * group.scaleX();
        tableData.seats[tableData.seats.length - 1].radiusY =
          tableShape.radiusY() * group.scaleY();
      }
    });

    floorPlan.tables.push(tableData);
  });

  const image = backgroundLayer.findOne(".floorLayoutImage");

  floorPlan.layoutImage = image
    ? {
        src: image.image().src,
        x: image.x(),
        y: image.y(),
        width: image.width(),
        height: image.height(),
        scaleX: image.scaleX(),
        scaleY: image.scaleY(),
        rotation: image.rotation(),
      }
    : null;

  return floorPlan;
}

function saveFloorPlanToLocalStorage() {
  const floorPlanData = getFloorPlanData();
  localStorage.setItem("floorPlan", JSON.stringify(floorPlanData));

  // const json = stage.toJSON();
  // localStorage.setItem("floorPlanJson", json);

  // const image = backgroundLayer.findOne(".floorLayoutImage");
  // if (image) {
  //   localStorage.setItem("floorPlanImageSrc", image.image().src);
  // } else {
  //   localStorage.removeItem("floorPlanImageSrc");
  // }
}

function loadFloorPlanFromLocalStorage() {
  const savedData = localStorage.getItem("floorPlan");
  if (savedData) {
    const floorPlan = JSON.parse(savedData);
    loadFloorPlanFromData(floorPlan);
  }

  // const json = localStorage.getItem("floorPlanJson");
  // if (json) {
  //   loadFloorPlanFromJson(json);
  // }
}
//loadFloorPlanFromJson not req.
function loadFloorPlanFromJson(json) {
  stage.destroyChildren();
  stage.clear();

  // Create new nodes from JSON
  Konva.Node.create(json, "container");

  // Re-assign globals
  backgroundLayer = stage.findOne(".background");
  tableLayer = stage.findOne(".table");
  globalTransformer = tableLayer.findOne("Transformer") || initTransformer(); // Recreate if not found

  // Re-attach transformer event
  globalTransformer.on("transform", handleGlobalTransform);

  // Reload background image if saved
  const savedSrc = localStorage.getItem("floorPlanImageSrc");
  if (savedSrc) {
    const konvaImage = backgroundLayer.findOne(".floorLayoutImage");
    if (konvaImage) {
      const img = new Image();
      img.src = savedSrc;
      img.onload = () => {
        konvaImage.image(img);
        backgroundLayer.batchDraw();
      };
    }
  }

  // Re-attach events to all tables and seats
  reattachEvents();

  // Repopulate table number generator with existing IDs
  usedTableNos.clear();
  tableLayer.find("Group").forEach((group) => {
    const id = parseInt(group.id(), 10);
    if (!isNaN(id)) {
      usedTableNos.add(id);
    }
  });

  // Reset selection
  selectedGroup = null;
  globalTransformer.nodes([]);
  stage.batchDraw();
}

function loadFloorPlanFromData(floorPlan) {
  tableLayer.destroyChildren();
  initTransformer();
  backgroundLayer.destroyChildren();

  floorPlan.tables.forEach((tableData) => {
    const {
      id,
      type,
      x,
      y,
      rotation,
      seats,
      width,
      height,
      seatCount,
      seatsPerSide,
      radius,
      radiusX,
      radiusY,
      label,
    } = tableData;

    if (type === "circle") {
      createTable({
        id,
        type: "circle",
        x: x || 200,
        y: y || 200,
        width: radius * 2,
        rotation,
        seatCount,
        seats,
        label,
      });
    } else if (type === "oval") {
      createTable({
        id,
        type: "oval",
        x: x || 200,
        y: y || 200,
        width: radiusX * 2,
        height: radiusY * 2,
        rotation,
        seatCount,
        seats,
        label,
      });
    } else if (type === "rectangle") {
      createTable({
        id,
        type: "rectangle",
        x: x || 800,
        y: y || 250,
        width,
        height,
        rotation,
        seatsPerSide,
        seats,
        label,
      });
    }
  });

  if (floorPlan.layoutImage) {
    const { src, x, y, width, height, scaleX, scaleY, rotation } =
      floorPlan.layoutImage;
    const image = new Image();
    image.src = src;
    image.onload = () => {
      const konvaImage = new Konva.Image({
        image: image,
        x: x,
        y: y,
        width: width,
        height: height,
        scaleX: scaleX || 1,
        scaleY: scaleY || 1,
        rotation: rotation || 0,
        draggable: true,
        name: "floorLayoutImage",
      });
      backgroundLayer.add(konvaImage);
      backgroundLayer.batchDraw();

      konvaImage.on("click tap", () => {
        selectedGroup = konvaImage;
        globalTransformer.nodes([konvaImage]);
        globalTransformer.keepRatio(true);
        tableLayer.batchDraw();
        backgroundLayer.batchDraw();
      });

      if (!selectedGroup) {
        selectedGroup = konvaImage;
        globalTransformer.nodes([konvaImage]);
        globalTransformer.keepRatio(true);
      }

      konvaImage.on("dragmove", () => {
        if (selectedGroup === konvaImage) {
          globalTransformer.forceUpdate();
        }
      });
      backgroundLayer.batchDraw();
    };
  }

  selectedGroup = null;
  globalTransformer.nodes([]);
  stage.batchDraw();
}
//reattachEvents not req.
function reattachEvents() {
  // Re-attach to tables
  tableLayer.find("Group").forEach((group) => {
    const type = group.getAttr("tableType");
    const tableShape =
      group.findOne("Rect") ||
      group.findOne("Ellipse") ||
      group.findOne("Circle");

    group.on("click tap", () => {
      selectedGroup = group;
      globalTransformer.nodes([group]);

      if (group.findOne("Rect") && tableShape.width() !== tableShape.height()) {
        globalTransformer.keepRatio(false);
      } else if (type === "circle" || type === "oval") {
        globalTransformer.keepRatio(true);
      }

      tableLayer.batchDraw();

      const tblShape = tableShape?.getClassName().toLowerCase();
      if (tblShape === "rect") {
        const seatsPerSide = group.getAttr("seatsPerSide");
        document.querySelector("#input-top").value = seatsPerSide.top || "";
        document.querySelector("#input-right").value = seatsPerSide.right || "";
        document.querySelector("#input-bottom").value =
          seatsPerSide.bottom || "";
        document.querySelector("#input-left").value = seatsPerSide.left || "";
        document.querySelector("#input-tableNo").value =
          group.findOne("Text").text() || "";
      } else if (tblShape === "circle" || tblShape === "ellipse") {
        document.querySelector("#input-seatCount").value =
          group.getAttr("seatCount") || "";
        document.querySelector("#input-tableNo").value =
          group.findOne("Text").text() || "";
      } else {
        resetSeatsCount();
      }
    });

    group.on("dragmove", () => {
      if (selectedGroup === group) {
        globalTransformer.forceUpdate();
      }
    });
  });

  // Re-attach to seats for toggling availability
  tableLayer.find(".seat").forEach((seat) => {
    seat.on("click", function () {
      const currentState = seat.getAttr("isAvailable") ?? true;
      seat.setAttr("isAvailable", !currentState);
      const colorKey = !currentState ? "available" : "unavailable";
      const seatColors = { available: "#008080", unavailable: "#808080" };
      seat.fill(seatColors[colorKey]);
      tableLayer.batchDraw();
    });
  });

  // Re-attach to background image if present
  const konvaImage = backgroundLayer.findOne(".floorLayoutImage");
  if (konvaImage) {
    konvaImage.on("click tap", () => {
      selectedGroup = konvaImage;
      globalTransformer.nodes([konvaImage]);
      globalTransformer.keepRatio(true);
      tableLayer.batchDraw();
      backgroundLayer.batchDraw();
    });

    konvaImage.on("dragmove", () => {
      if (selectedGroup === konvaImage) {
        globalTransformer.forceUpdate();
      }
    });
  }
}

function resetSeatsCount() {
  document.querySelector("#input-top").value = "";
  document.querySelector("#input-right").value = "";
  document.querySelector("#input-bottom").value = "";
  document.querySelector("#input-left").value = "";
  document.querySelector("#input-tableNo").value = "";
}

function* tableNoGenerator() {
  let tableNo = 1;
  const usedTableNos = new Set();

  while (true) {
    while (usedTableNos.has(tableNo)) {
      tableNo++;
    }

    usedTableNos.add(tableNo);
    yield tableNo++;
  }
}

function getSeatAvailabilityMap(group) {
  const map = {};
  group.getChildren().forEach((seatNode) => {
    const number = seatNode.getAttr("seatNumber");
    const className = seatNode.getAttr("itemType");
    const isAvailable = seatNode.getAttr("isAvailable");
    if (className !== "seat") {
      return;
    }
    if (number != null) {
      map[number] = isAvailable;
    }
  });
  return map;
}

function getSeatRadiusOfSeat(group) {
  const seatNode = group
    .getChildren()
    .find((seatNode) => seatNode.getAttr("itemType") === "seat");
  return seatNode ? seatNode.getAttr("radius") : undefined;
}

function getSeatRadius(tableSize) {
  return Math.min(12, Math.max(6, tableSize / 10));
}

function addIconToTableLabel(iconUrl, group, x, y) {
  const iconImage = new Image();
  iconImage.src = iconUrl;
  iconImage.onload = function () {
    const icon = new Konva.Image({
      x: x + 30,
      y: y - 10,
      image: iconImage,
      width: 20,
      height: 20,
    });
    group.add(icon);
  };
}

function addTimerToTable(group, x, y, label) {
  let timer = 0;

  const timerText = new Konva.Text({
    x: x,
    y: y + 20,
    text: formatTime(timer),
    fontSize: 10,
    fill: "black",
    listening: false,
    name: `timer-text`,
    className: "timer-text",
  });

  group.add(timerText);

  const intervalId = setInterval(() => {
    timer++;
    timerText.text(formatTime(timer));
    group.getLayer().batchDraw();
  }, 1000);

  group.setAttr("timerIntervalId", intervalId);
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${padZero(minutes)}:${padZero(remainingSeconds)}`;
}

function padZero(num) {
  return num < 10 ? `0${num}` : `${num}`;
}

function toggleSidebar() {
  const sidebar = document.querySelector(".sidebar");
  sidebar.classList.toggle("open");
}
