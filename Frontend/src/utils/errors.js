const fieldLabels = {
  body: "",
  email: "Email",
  password: "Password",
  name: "Name",
  mobile: "Mobile number",
  dob: "Date of birth",
};

export const formatApiError = (error, fallback = "Something went wrong.") => {
  const data = error?.response?.data;
  const detail = data?.detail;

  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        const location = Array.isArray(item.loc) ? item.loc.filter(Boolean) : [];
        const field = location[location.length - 1];
        const label = fieldLabels[field] || field;
        return label ? `${label}: ${item.msg}` : item.msg;
      })
      .join("\n");
  }

  if (typeof detail === "string") {
    return detail;
  }

  if (detail?.message) {
    return detail.message;
  }

  if (typeof data?.message === "string") {
    return data.message;
  }

  return error?.message || fallback;
};
