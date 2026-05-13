export const profileFieldConfigs = [
  { autoComplete: "name", key: "realName", label: "姓名" },
  { autoComplete: "off", key: "grade", label: "年级" },
  { autoComplete: "off", key: "studentId", label: "学号" },
  { autoComplete: "organization-title", key: "major", label: "专业" },
] as const;

export const gradeOtherOption = "其他";
const gradeLookbackYears = 7;

export type ProfileFieldKey = (typeof profileFieldConfigs)[number]["key"];
export type ProfileFormValues = Record<ProfileFieldKey, string>;
export type ProfileData = Partial<Record<ProfileFieldKey, null | string>>;
export type ProfileUpdateValues = Partial<ProfileFormValues>;

export const emptyProfileFormValues: ProfileFormValues = {
  grade: "",
  major: "",
  realName: "",
  studentId: "",
};

export const buildProfileFormValues = (
  profile: null | ProfileData | undefined
): ProfileFormValues => ({
  grade: profile?.grade ?? "",
  major: profile?.major ?? "",
  realName: profile?.realName ?? "",
  studentId: profile?.studentId ?? "",
});

export const getProfileDisplayValue = (value: null | string | undefined) =>
  value ? value : "未填写";

export const getGradeOptions = (currentDate = new Date()) => {
  const currentYear = currentDate.getFullYear();
  const startYear = currentYear - gradeLookbackYears;
  const yearOptions = Array.from(
    { length: gradeLookbackYears + 1 },
    (_, index) => `${startYear + index}级`
  );

  return [...yearOptions, gradeOtherOption];
};

export const isValidGradeOption = (grade: string) =>
  getGradeOptions().includes(grade);

export const getGradeOptionsWithCurrentValue = (
  currentValue: string,
  currentDate = new Date()
) => {
  const options = getGradeOptions(currentDate);

  if (!currentValue || options.includes(currentValue)) {
    return options;
  }

  return [currentValue, ...options];
};

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
