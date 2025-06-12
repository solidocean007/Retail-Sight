import { UserType } from "./types";

export const flattenUser = (user: UserType) => ({
  postUserUid: user.uid,
  postUserFirstName: user.firstName,
  postUserLastName: user.lastName,
  postUserProfileUrlThumbnail: user.profileUrlThumbnail,
  postUserProfileUrlOriginal: user.profileUrlOriginal,
  postUserEmail: user.email,
  postUserCompanyId: user.companyId,
  postUserCompanyName: user.company,
  postUserSalesRouteNum: user.salesRouteNum,
  postUserPhone: user.phone,
  postUser: user,
  postUserRole: user.role,
});
