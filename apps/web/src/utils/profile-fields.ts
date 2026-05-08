export const profileFieldConfigs = [
  { autoComplete: "name", key: "realName", label: "姓名" },
  { autoComplete: "off", key: "grade", label: "年级" },
  { autoComplete: "off", key: "studentId", label: "学号" },
  { autoComplete: "organization-title", key: "major", label: "专业" },
] as const;

export type ProfileFieldKey = (typeof profileFieldConfigs)[number]["key"];
export type ProfileFormValues = Record<ProfileFieldKey, string>;
export type ProfileData = Partial<Record<ProfileFieldKey, null | string>>;

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
