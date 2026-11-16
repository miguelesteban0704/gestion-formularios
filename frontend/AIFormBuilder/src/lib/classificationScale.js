import { scaleOf } from "./fieldTypes.js";

const isAnswerObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

function scoreOf(value) {
  const raw = isAnswerObject(value) ? value.value ?? value.priority : value;
  if (Number.isInteger(raw)) return raw;
  if (typeof raw === "string" && raw.trim() !== "" && Number.isInteger(Number(raw))) {
    return Number(raw);
  }
  return null;
}

function hasSelection(value) {
  if (isAnswerObject(value)) {
    return scoreOf(value) !== null || value.value === "other" || value.priority === "other";
  }
  return value !== undefined && value !== null && value !== "";
}

function clampScore(value, scale) {
  const score = Number(value);
  if (!Number.isFinite(score)) return scale.min;
  return Math.min(scale.max, Math.max(scale.min, Math.round(score)));
}

export function getClassificationScaleItems(field, answer = {}, config = {}) {
  const scale = scaleOf(field);
  const values = isAnswerObject(answer) ? answer : {};
  const includeConditional = config?.includeConditional !== false;
  const options = Array.isArray(field?.options) ? field.options : [];
  const items = options.map((option) => {
    const stored = values[option.id];
    return {
      id: option.id,
      label: option.label ?? "",
      isOther: option.isOther === true,
      value: scoreOf(stored),
      ...(option.isOther === true && isAnswerObject(stored) && typeof stored.otherText === "string"
        ? { otherText: stored.otherText }
        : {}),
    };
  });

  const otherOption = options.find((option) => option.isOther === true);
  const conditional = field?.conditionalOption;
  if (
    !includeConditional ||
    field?.visibleIf?.sameFieldCondition !== "__other__" ||
    !otherOption ||
    !conditional?.id ||
    !hasSelection(values[otherOption.id])
  ) {
    return items;
  }

  const storedScore = scoreOf(values[conditional.id]);
  items.push({
    id: conditional.id,
    label: conditional.label ?? "",
    isConditional: true,
    value: storedScore ?? clampScore(conditional.defaultValue, scale),
  });
  return items;
}

export function updateClassificationScaleAnswer(field, answer, itemId, score) {
  const values = isAnswerObject(answer) ? { ...answer } : {};
  const item = getClassificationScaleItems(field, values).find((candidate) => candidate.id === itemId);
  if (!item) throw new RangeError("Unknown classification scale item.");

  const scale = scaleOf(field);
  if (score !== null && (!Number.isInteger(score) || score < scale.min || score > scale.max)) {
    throw new RangeError("Classification scale score is outside the configured range.");
  }

  if (score === null) {
    const previous = values[itemId];
    if (item.isOther && isAnswerObject(previous)) {
      values[itemId] = { value: null, otherText: previous.otherText };
    } else {
      delete values[itemId];
    }
    return values;
  }

  if (item.isOther) {
    const previous = values[itemId];
    const otherText = isAnswerObject(previous) && typeof previous.otherText === "string"
      ? previous.otherText
      : "";
    values[itemId] = { value: score, otherText };
  } else {
    values[itemId] = score;
  }

  return values;
}

export function activateClassificationScaleOther(field, answer, itemId) {
  const option = (Array.isArray(field?.options) ? field.options : []).find(
    (candidate) => candidate.id === itemId && candidate.isOther === true,
  );
  if (!option) throw new RangeError("Unknown Other option.");

  const values = isAnswerObject(answer) ? { ...answer } : {};
  const previous = values[itemId];
  const otherText = isAnswerObject(previous) && typeof previous.otherText === "string"
    ? previous.otherText
    : "";
  values[itemId] = { value: scoreOf(previous), otherText };
  return values;
}

export function validateClassificationScaleAnswer(field, answer, t = (key) => key) {
  const scale = scaleOf(field);
  const values = isAnswerObject(answer) ? answer : {};
  const items = getClassificationScaleItems(field, answer, { includeConditional: false });

  for (const item of items) {
    const raw = values[item.id];
    const rawScore = scoreOf(raw);
    const rawPresent = raw !== undefined && raw !== null && raw !== "";
    const legacyOtherMarker =
      item.isOther &&
      isAnswerObject(raw) &&
      (raw.value === "other" || raw.priority === "other");

    if (
      rawPresent &&
      rawScore === null &&
      !legacyOtherMarker &&
      !(item.isOther && isAnswerObject(raw) && raw.value === null)
    ) {
      return t("classificationScaleOutOfRange");
    }

    if (item.value !== null && (!Number.isInteger(item.value) || item.value < scale.min || item.value > scale.max)) {
      return t("classificationScaleOutOfRange");
    }

    if (item.isOther && rawPresent) {
      if (!Number.isInteger(item.value)) return t("classificationScaleIncomplete");
      const otherText = isAnswerObject(raw) ? raw.otherText : "";
      if (typeof otherText !== "string" || !otherText.trim()) {
        return t("classificationScaleOtherTextRequired");
      }
    }

    if (field?.required && !item.isOther && !Number.isInteger(item.value)) {
      return t("classificationScaleIncomplete");
    }
  }

  return null;
}
