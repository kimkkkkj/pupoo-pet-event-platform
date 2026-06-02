import { axiosInstance } from "../../app/http/axiosInstance";

// 기능: generated API 공통 URL 빌더를 제공한다.
// 설명: path parameter가 포함된 backend 경로를 안전하게 실제 요청 URL로 변환한다.
// 흐름: 템플릿 순회 -> 필수 파라미터 검증 -> URL 인코딩 후 치환.

function buildUrl(template, pathParams = {}) {
  // 기능: 경로 템플릿에 path param을 주입한다.
  // 설명: generated API 함수들이 공통 규칙으로 URL을 만들도록 돕는다.
  // 흐름: 템플릿 순회 -> 필수 파라미터 검증 -> URL 인코딩 후 치환.
  return template.replace(/\{([^}]+)\}/g, (_, key) => {
    const value = pathParams[key];
    if (value === undefined || value === null) {
      throw new Error(`Missing required path param: ${key}`);
    }
    return encodeURIComponent(String(value));
  });
}

export const siteGeneratedApi = {
  // DELETE /api/files/admin/{fileId} (StorageController#deleteByAdmin)
  deleteapiFilesAdminByFileId(pathParams = {}, params = {}, config = {}) {
    const url = buildUrl("/api/files/admin/{fileId}", pathParams);
    return axiosInstance.delete(url, { ...config, params });
  },

  // DELETE /api/social-accounts/unlink (SocialAccountController#unlinkSocialAccount)
  deleteapiSocialAccountsUnlink(pathParams = {}, params = {}, config = {}) {
    const url = buildUrl("/api/social-accounts/unlink", pathParams);
    return axiosInstance.delete(url, { ...config, params });
  },

  // GET /api/auth/email/verification/confirm (AuthVerificationController#confirmEmailVerification)
  getapiAuthEmailVerificationConfirm(pathParams = {}, params = {}, config = {}) {
    const url = buildUrl("/api/auth/email/verification/confirm", pathParams);
    return axiosInstance.get(url, { ...config, params });
  },

  // GET /api/booths/{boothId} (BoothController#getBoothDetail)
  getapiBoothsByBoothId(pathParams = {}, params = {}, config = {}) {
    const url = buildUrl("/api/booths/{boothId}", pathParams);
    return axiosInstance.get(url, { ...config, params });
  },

  // GET /api/events/{eventId}/booths (BoothController#getEventBooths)
  getapiEventsByEventIdBooths(pathParams = {}, params = {}, config = {}) {
    const url = buildUrl("/api/events/{eventId}/booths", pathParams);
    return axiosInstance.get(url, { ...config, params });
  },

  // GET /api/faqs (FaqController#list)
  getapiFaqs(pathParams = {}, params = {}, config = {}) {
    const url = buildUrl("/api/faqs", pathParams);
    return axiosInstance.get(url, { ...config, params });
  },

  // GET /api/faqs/{postId} (FaqController#get)
  getapiFaqsByPostId(pathParams = {}, params = {}, config = {}) {
    const url = buildUrl("/api/faqs/{postId}", pathParams);
    return axiosInstance.get(url, { ...config, params });
  },

  // GET /api/files/{fileId}/download (StorageController#redirectToStatic)
  getapiFilesByFileIdDownload(pathParams = {}, params = {}, config = {}) {
    const url = buildUrl("/api/files/{fileId}/download", pathParams);
    return axiosInstance.get(url, { ...config, params });
  },

  // GET /api/interests (InterestController#getAll)
  getapiInterests(pathParams = {}, params = {}, config = {}) {
    const url = buildUrl("/api/interests", pathParams);
    return axiosInstance.get(url, { ...config, params });
  },

  // GET /api/refunds/my (RefundController#myRefunds)
  getapiRefundsMy(pathParams = {}, params = {}, config = {}) {
    const url = buildUrl("/api/refunds/my", pathParams);
    return axiosInstance.get(url, { ...config, params });
  },

  // GET /api/report-reasons (ReportReasonController#list)
  getapiReportReasons(pathParams = {}, params = {}, config = {}) {
    const url = buildUrl("/api/report-reasons", pathParams);
    return axiosInstance.get(url, { ...config, params });
  },

  // GET /api/social-accounts (SocialAccountController#getMySocialAccounts)
  getapiSocialAccounts(pathParams = {}, params = {}, config = {}) {
    const url = buildUrl("/api/social-accounts", pathParams);
    return axiosInstance.get(url, { ...config, params });
  },

  // GET /api/speakers (SpeakerController#getSpeakers)
  getapiSpeakers(pathParams = {}, params = {}, config = {}) {
    const url = buildUrl("/api/speakers", pathParams);
    return axiosInstance.get(url, { ...config, params });
  },

  // GET /api/speakers/{speakerId} (SpeakerController#getSpeaker)
  getapiSpeakersBySpeakerId(pathParams = {}, params = {}, config = {}) {
    const url = buildUrl("/api/speakers/{speakerId}", pathParams);
    return axiosInstance.get(url, { ...config, params });
  },

  // PATCH /api/posts/{postId}/close (PostController#closePost)
  patchapiPostsByPostIdClose(pathParams = {}, data = {}, params = {}, config = {}) {
    const url = buildUrl("/api/posts/{postId}/close", pathParams);
    return axiosInstance.patch(url, data, { ...config, params });
  },

  // POST /api/files/admin/notice (StorageController#uploadNoticeByAdmin)
  postapiFilesAdminNotice(pathParams = {}, data = {}, params = {}, config = {}) {
    const url = buildUrl("/api/files/admin/notice", pathParams);
    return axiosInstance.post(url, data, { ...config, params });
  },

  // POST /api/interests/mysubscriptions (InterestController#mySubscriptions)
  postapiInterestsMysubscriptions(pathParams = {}, data = {}, params = {}, config = {}) {
    const url = buildUrl("/api/interests/mysubscriptions", pathParams);
    return axiosInstance.post(url, data, { ...config, params });
  },

  // POST /api/interests/subscribe (InterestController#subscribe)
  postapiInterestsSubscribe(pathParams = {}, data = {}, params = {}, config = {}) {
    const url = buildUrl("/api/interests/subscribe", pathParams);
    return axiosInstance.post(url, data, { ...config, params });
  },

  // POST /api/interests/unsubscribe (InterestController#unsubscribe)
  postapiInterestsUnsubscribe(pathParams = {}, data = {}, params = {}, config = {}) {
    const url = buildUrl("/api/interests/unsubscribe", pathParams);
    return axiosInstance.post(url, data, { ...config, params });
  },

  // POST /api/payments/{paymentId}/cancel (PaymentController#cancel)
  postapiPaymentsByPaymentIdCancel(pathParams = {}, data = {}, params = {}, config = {}) {
    const url = buildUrl("/api/payments/{paymentId}/cancel", pathParams);
    return axiosInstance.post(url, data, { ...config, params });
  },

  // POST /api/posts/{postId}/report (PostController#reportPost)
  postapiPostsByPostIdReport(pathParams = {}, data = {}, params = {}, config = {}) {
    const url = buildUrl("/api/posts/{postId}/report", pathParams);
    return axiosInstance.post(url, data, { ...config, params });
  },

  // POST /api/refunds (RefundController#requestRefund)
  postapiRefunds(pathParams = {}, data = {}, params = {}, config = {}) {
    const url = buildUrl("/api/refunds", pathParams);
    return axiosInstance.post(url, data, { ...config, params });
  },

  // POST /api/replies/{targetType}/{replyId}/report (ReplyController#report)
  postapiRepliesByTargetTypeByReplyIdReport(pathParams = {}, data = {}, params = {}, config = {}) {
    const url = buildUrl("/api/replies/{targetType}/{replyId}/report", pathParams);
    return axiosInstance.post(url, data, { ...config, params });
  },

  // POST /api/reviews/{reviewId}/report (ReviewController#report)
  postapiReviewsByReviewIdReport(pathParams = {}, data = {}, params = {}, config = {}) {
    const url = buildUrl("/api/reviews/{reviewId}/report", pathParams);
    return axiosInstance.post(url, data, { ...config, params });
  },

  // POST /api/social-accounts/link (SocialAccountController#linkSocialAccount)
  postapiSocialAccountsLink(pathParams = {}, data = {}, params = {}, config = {}) {
    const url = buildUrl("/api/social-accounts/link", pathParams);
    return axiosInstance.post(url, data, { ...config, params });
  },

  // POST /api/users/me/email-verification/request (AuthVerificationController#requestEmailVerification)
  postapiUsersMeEmailVerificationRequest(pathParams = {}, data = {}, params = {}, config = {}) {
    const url = buildUrl("/api/users/me/email-verification/request", pathParams);
    return axiosInstance.post(url, data, { ...config, params });
  },

  // POST /api/users/me/phone-verification/confirm (AuthVerificationController#confirmPhoneVerification)
  postapiUsersMePhoneVerificationConfirm(pathParams = {}, data = {}, params = {}, config = {}) {
    const url = buildUrl("/api/users/me/phone-verification/confirm", pathParams);
    return axiosInstance.post(url, data, { ...config, params });
  },

  // POST /api/users/me/phone-verification/request (AuthVerificationController#requestPhoneVerification)
  postapiUsersMePhoneVerificationRequest(pathParams = {}, data = {}, params = {}, config = {}) {
    const url = buildUrl("/api/users/me/phone-verification/request", pathParams);
    return axiosInstance.post(url, data, { ...config, params });
  },

};
