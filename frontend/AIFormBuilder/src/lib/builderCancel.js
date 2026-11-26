export function isCancelableNewBuilderForm(form, createdFormId) {
  return Boolean(
    form?._id &&
    form._id === createdFormId &&
    form.status !== "published"
  );
}
