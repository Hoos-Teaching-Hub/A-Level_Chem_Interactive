const randomSuffix = () => crypto.randomUUID().slice(0, 8);

export const makeClassCode = () => `class_${randomSuffix()}`;
export const makeStudentCode = () => `student_${randomSuffix()}`;
export const makeTeacherCode = () => `teach_${randomSuffix()}`;
export const makeActivityId = () => `activity_${randomSuffix()}`;

export const makeRateLimitIp = (octet = Math.floor(Math.random() * 200) + 1) =>
  `203.0.113.${octet}`;
