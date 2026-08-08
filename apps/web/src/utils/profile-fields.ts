export const profileFieldConfigs = [
  { autoComplete: "name", key: "realName", label: "姓名" },
  { autoComplete: "off", key: "grade", label: "年级" },
  { autoComplete: "off", key: "studentId", label: "学号" },
  { autoComplete: "organization-title", key: "major", label: "专业" },
] as const;

export type ProfileFieldConfig = (typeof profileFieldConfigs)[number];
export type ProfileFieldKey = (typeof profileFieldConfigs)[number]["key"];
export type ProfileFormValues = Record<ProfileFieldKey, string>;
export type ProfileData = Record<ProfileFieldKey, string>;
export type ProfileUpdateValues = Partial<ProfileFormValues>;

export const emptyProfileFormValues: ProfileFormValues = {
  grade: "",
  major: "",
  realName: "",
  studentId: "",
};

export const buildProfileFormValues = (
  profile: ProfileData
): ProfileFormValues => ({ ...profile });

export const getChangedProfileValues = (
  currentValues: ProfileFormValues,
  originalValues: ProfileFormValues
): ProfileUpdateValues => {
  const changedValues: ProfileUpdateValues = {};

  for (const field of profileFieldConfigs) {
    if (currentValues[field.key] !== originalValues[field.key]) {
      changedValues[field.key] = currentValues[field.key];
    }
  }

  return changedValues;
};

export const hasProfileUpdateValues = (
  values: ProfileUpdateValues
): values is ProfileUpdateValues & Partial<ProfileFormValues> => {
  for (const field of profileFieldConfigs) {
    if (field.key in values) {
      return true;
    }
  }

  return false;
};
