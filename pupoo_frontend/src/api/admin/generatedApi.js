import { axiosInstance } from "../../app/http/axiosInstance";

function buildUrl(template, pathParams = {}) {
  return template.replace(/\{([^}]+)\}/g, (_, key) => {
    const value = pathParams[key];
    if (value === undefined || value === null) {
      throw new Error(`Missing required path param: ${key}`);
    }
    return encodeURIComponent(String(value));
  });
}

export const adminGeneratedApi = {
  // DELETE /api/admin/faqs/{postId} (AdminFaqController#delete)
  deleteapiAdminFaqsByPostId(pathParams = {}, params = {}, config = {}) {
    const url = buildUrl("/api/admin/faqs/{postId}", pathParams);
    return axiosInstance.delete(url, { ...config, params });
  },

  // DELETE /api/admin/files/{fileId} (AdminStorageController#delete)
  deleteapiAdminFilesByFileId(pathParams = {}, params = {}, config = {}) {
    const url = buildUrl("/api/admin/files/{fileId}", pathParams);
    return axiosInstance.delete(url, { ...config, params });
  },

  // DELETE /api/admin/moderation/posts/{postId} (AdminModerationController#deletePost)
  deleteapiAdminModerationPostsByPostId(pathParams = {}, params = {}, config = {}) {
    const url = buildUrl("/api/admin/moderation/posts/{postId}", pathParams);
    return axiosInstance.delete(url, { ...config, params });
  },

  // DELETE /api/admin/moderation/replies/{targetType}/{commentId} (AdminModerationController#deleteReply)
  deleteapiAdminModerationRepliesByTargetTypeByCommentId(pathParams = {}, params = {}, config = {}) {
    const url = buildUrl("/api/admin/moderation/replies/{targetType}/{commentId}", pathParams);
    return axiosInstance.delete(url, { ...config, params });
  },

  // DELETE /api/admin/moderation/reviews/{reviewId} (AdminModerationController#deleteReview)
  deleteapiAdminModerationReviewsByReviewId(pathParams = {}, params = {}, config = {}) {
    const url = buildUrl("/api/admin/moderation/reviews/{reviewId}", pathParams);
    return axiosInstance.delete(url, { ...config, params });
  },

  // DELETE /api/admin/programs/{programId} (ProgramAdminController#delete)
  deleteapiAdminProgramsByProgramId(pathParams = {}, params = {}, config = {}) {
    const url = buildUrl("/api/admin/programs/{programId}", pathParams);
    return axiosInstance.delete(url, { ...config, params });
  },

  // DELETE /api/admin/speakers/{speakerId} (SpeakerAdminController#deleteSpeaker)
  deleteapiAdminSpeakersBySpeakerId(pathParams = {}, params = {}, config = {}) {
    const url = buildUrl("/api/admin/speakers/{speakerId}", pathParams);
    return axiosInstance.delete(url, { ...config, params });
  },

  // DELETE /api/admin/users/{id} (AdminUserController#delete)
  deleteapiAdminUsersById(pathParams = {}, params = {}, config = {}) {
    const url = buildUrl("/api/admin/users/{id}", pathParams);
    return axiosInstance.delete(url, { ...config, params });
  },

  // GET /api/admin/analytics/events (AdminAnalyticsController#eventPerformance)
  getapiAdminAnalyticsEvents(pathParams = {}, params = {}, config = {}) {
    const url = buildUrl("/api/admin/analytics/events", pathParams);
    return axiosInstance.get(url, { ...config, params });
  },

  // GET /api/admin/analytics/events/{eventId}/congestion-by-hour (AdminAnalyticsController#congestionByHour)
  getapiAdminAnalyticsEventsByEventIdCongestionByHour(pathParams = {}, params = {}, config = {}) {
    const url = buildUrl("/api/admin/analytics/events/{eventId}/congestion-by-hour", pathParams);
    return axiosInstance.get(url, { ...config, params });
  },

  // GET /api/admin/analytics/yearly (AdminAnalyticsController#yearly)
  getapiAdminAnalyticsYearly(pathParams = {}, params = {}, config = {}) {
    const url = buildUrl("/api/admin/analytics/yearly", pathParams);
    return axiosInstance.get(url, { ...config, params });
  },

  // GET /api/admin/boards/{boardId} (BoardController#getBoard)
  getapiAdminBoardsByBoardId(pathParams = {}, params = {}, config = {}) {
    const url = buildUrl("/api/admin/boards/{boardId}", pathParams);
    return axiosInstance.get(url, { ...config, params });
  },

  // GET /api/admin/dashboard (DashboardController#summary)
  getapiAdminDashboard(pathParams = {}, params = {}, config = {}) {
    const url = buildUrl("/api/admin/dashboard", pathParams);
    return axiosInstance.get(url, { ...config, params });
  },

  // GET /api/admin/dashboard/{id} (DashboardController#summaryById)
  getapiAdminDashboardById(pathParams = {}, params = {}, config = {}) {
    const url = buildUrl("/api/admin/dashboard/{id}", pathParams);
    return axiosInstance.get(url, { ...config, params });
  },

  // GET /api/admin/dashboard/programs (AdminDashboardController#listPrograms)
  getapiAdminDashboardPrograms(pathParams = {}, params = {}, config = {}) {
    const url = buildUrl("/api/admin/dashboard/programs", pathParams);
    return axiosInstance.get(url, { ...config, params });
  },

  // GET /api/admin/dashboard/realtime/events (AdminDashboardRealtimeController#events)
  getapiAdminDashboardRealtimeEvents(pathParams = {}, params = {}, config = {}) {
    const url = buildUrl("/api/admin/dashboard/realtime/events", pathParams);
    return axiosInstance.get(url, { ...config, params });
  },

  // GET /api/admin/dashboard/realtime/events/{eventId}/congestions (AdminDashboardRealtimeController#congestions)
  getapiAdminDashboardRealtimeEventsByEventIdCongestions(pathParams = {}, params = {}, config = {}) {
    const url = buildUrl("/api/admin/dashboard/realtime/events/{eventId}/congestions", pathParams);
    return axiosInstance.get(url, { ...config, params });
  },

  // GET /api/admin/dashboard/realtime/summary (AdminDashboardRealtimeController#summary)
  getapiAdminDashboardRealtimeSummary(pathParams = {}, params = {}, config = {}) {
    const url = buildUrl("/api/admin/dashboard/realtime/summary", pathParams);
    return axiosInstance.get(url, { ...config, params });
  },

  // GET /api/admin/events (AdminEventOperationController#list)
  getapiAdminEvents(pathParams = {}, params = {}, config = {}) {
    const url = buildUrl("/api/admin/events", pathParams);
    return axiosInstance.get(url, { ...config, params });
  },

  // GET /api/admin/events/{eventId} (AdminEventOperationController#get)
  getapiAdminEventsByEventId(pathParams = {}, params = {}, config = {}) {
    const url = buildUrl("/api/admin/events/{eventId}", pathParams);
    return axiosInstance.get(url, { ...config, params });
  },

  // GET /api/admin/galleries (GalleryAdminController#list)
  getapiAdminGalleries(pathParams = {}, params = {}, config = {}) {
    const url = buildUrl("/api/admin/galleries", pathParams);
    return axiosInstance.get(url, { ...config, params });
  },

  // GET /api/admin/inquiries (InquiryController#getInquiries)
  getapiAdminInquiries(pathParams = {}, params = {}, config = {}) {
    const url = buildUrl("/api/admin/inquiries", pathParams);
    return axiosInstance.get(url, { ...config, params });
  },

  // GET /api/admin/moderation/posts (AdminModerationController#searchPosts)
  getapiAdminModerationPosts(pathParams = {}, params = {}, config = {}) {
    const url = buildUrl("/api/admin/moderation/posts", pathParams);
    return axiosInstance.get(url, { ...config, params });
  },

  // GET /api/admin/moderation/replies (AdminModerationController#searchReplies)
  getapiAdminModerationReplies(pathParams = {}, params = {}, config = {}) {
    const url = buildUrl("/api/admin/moderation/replies", pathParams);
    return axiosInstance.get(url, { ...config, params });
  },

  // GET /api/admin/moderation/reviews (AdminModerationController#searchReviews)
  getapiAdminModerationReviews(pathParams = {}, params = {}, config = {}) {
    const url = buildUrl("/api/admin/moderation/reviews", pathParams);
    return axiosInstance.get(url, { ...config, params });
  },

  // GET /api/admin/payments (AdminPaymentsController#payments)
  getapiAdminPayments(pathParams = {}, params = {}, config = {}) {
    const url = buildUrl("/api/admin/payments", pathParams);
    return axiosInstance.get(url, { ...config, params });
  },

  // GET /api/admin/payments/{id} (AdminPaymentsController#payment)
  getapiAdminPaymentsById(pathParams = {}, params = {}, config = {}) {
    const url = buildUrl("/api/admin/payments/{id}", pathParams);
    return axiosInstance.get(url, { ...config, params });
  },

  // GET /api/admin/refunds (AdminRefundsController#refunds)
  getapiAdminRefunds(pathParams = {}, params = {}, config = {}) {
    const url = buildUrl("/api/admin/refunds", pathParams);
    return axiosInstance.get(url, { ...config, params });
  },

  // GET /api/admin/refunds/{id} (AdminRefundsController#refund)
  getapiAdminRefundsById(pathParams = {}, params = {}, config = {}) {
    const url = buildUrl("/api/admin/refunds/{id}", pathParams);
    return axiosInstance.get(url, { ...config, params });
  },

  // GET /api/admin/reports (AdminReportController#list)
  getapiAdminReports(pathParams = {}, params = {}, config = {}) {
    const url = buildUrl("/api/admin/reports", pathParams);
    return axiosInstance.get(url, { ...config, params });
  },

  // GET /api/admin/reports/{reportId} (AdminReportController#detail)
  getapiAdminReportsByReportId(pathParams = {}, params = {}, config = {}) {
    const url = buildUrl("/api/admin/reports/{reportId}", pathParams);
    return axiosInstance.get(url, { ...config, params });
  },

  // GET /api/admin/users (AdminUserController#list)
  getapiAdminUsers(pathParams = {}, params = {}, config = {}) {
    const url = buildUrl("/api/admin/users", pathParams);
    return axiosInstance.get(url, { ...config, params });
  },

  // GET /api/admin/users/{id} (AdminUserController#get)
  getapiAdminUsersById(pathParams = {}, params = {}, config = {}) {
    const url = buildUrl("/api/admin/users/{id}", pathParams);
    return axiosInstance.get(url, { ...config, params });
  },

  // PATCH /api/admin/boards/{boardId}/active (BoardController#changeActive)
  patchapiAdminBoardsByBoardIdActive(pathParams = {}, data = {}, params = {}, config = {}) {
    const url = buildUrl("/api/admin/boards/{boardId}/active", pathParams);
    return axiosInstance.patch(url, data, { ...config, params });
  },

  // PATCH /api/admin/events/{eventId} (AdminEventOperationController#updateEvent)
  patchapiAdminEventsByEventId(pathParams = {}, data = {}, params = {}, config = {}) {
    const url = buildUrl("/api/admin/events/{eventId}", pathParams);
    return axiosInstance.patch(url, data, { ...config, params });
  },

  // PATCH /api/admin/events/{eventId}/status (AdminEventOperationController#changeStatus)
  patchapiAdminEventsByEventIdStatus(pathParams = {}, data = {}, params = {}, config = {}) {
    const url = buildUrl("/api/admin/events/{eventId}/status", pathParams);
    return axiosInstance.patch(url, data, { ...config, params });
  },

  // PATCH /api/admin/faqs/{postId} (AdminFaqController#update)
  patchapiAdminFaqsByPostId(pathParams = {}, data = {}, params = {}, config = {}) {
    const url = buildUrl("/api/admin/faqs/{postId}", pathParams);
    return axiosInstance.patch(url, data, { ...config, params });
  },

  // PATCH /api/admin/inquiries/{inquiryId}/status (InquiryController#changeStatus)
  patchapiAdminInquiriesByInquiryIdStatus(pathParams = {}, data = {}, params = {}, config = {}) {
    const url = buildUrl("/api/admin/inquiries/{inquiryId}/status", pathParams);
    return axiosInstance.patch(url, data, { ...config, params });
  },

  // PATCH /api/admin/moderation/posts/{postId}/hide (AdminModerationController#hidePost)
  patchapiAdminModerationPostsByPostIdHide(pathParams = {}, data = {}, params = {}, config = {}) {
    const url = buildUrl("/api/admin/moderation/posts/{postId}/hide", pathParams);
    return axiosInstance.patch(url, data, { ...config, params });
  },

  // PATCH /api/admin/moderation/posts/{postId}/restore (AdminModerationController#restorePost)
  patchapiAdminModerationPostsByPostIdRestore(pathParams = {}, data = {}, params = {}, config = {}) {
    const url = buildUrl("/api/admin/moderation/posts/{postId}/restore", pathParams);
    return axiosInstance.patch(url, data, { ...config, params });
  },

  // PATCH /api/admin/moderation/replies/{targetType}/{commentId}/hide (AdminModerationController#hideReply)
  patchapiAdminModerationRepliesByTargetTypeByCommentIdHide(pathParams = {}, data = {}, params = {}, config = {}) {
    const url = buildUrl("/api/admin/moderation/replies/{targetType}/{commentId}/hide", pathParams);
    return axiosInstance.patch(url, data, { ...config, params });
  },

  // PATCH /api/admin/moderation/replies/{targetType}/{commentId}/restore (AdminModerationController#restoreReply)
  patchapiAdminModerationRepliesByTargetTypeByCommentIdRestore(pathParams = {}, data = {}, params = {}, config = {}) {
    const url = buildUrl("/api/admin/moderation/replies/{targetType}/{commentId}/restore", pathParams);
    return axiosInstance.patch(url, data, { ...config, params });
  },

  // PATCH /api/admin/moderation/reviews/{reviewId}/blind (AdminModerationController#blindReview)
  patchapiAdminModerationReviewsByReviewIdBlind(pathParams = {}, data = {}, params = {}, config = {}) {
    const url = buildUrl("/api/admin/moderation/reviews/{reviewId}/blind", pathParams);
    return axiosInstance.patch(url, data, { ...config, params });
  },

  // PATCH /api/admin/moderation/reviews/{reviewId}/restore (AdminModerationController#restoreReview)
  patchapiAdminModerationReviewsByReviewIdRestore(pathParams = {}, data = {}, params = {}, config = {}) {
    const url = buildUrl("/api/admin/moderation/reviews/{reviewId}/restore", pathParams);
    return axiosInstance.patch(url, data, { ...config, params });
  },

  // PATCH /api/admin/posts/{postId}/delete (AdminPostController#delete)
  patchapiAdminPostsByPostIdDelete(pathParams = {}, data = {}, params = {}, config = {}) {
    const url = buildUrl("/api/admin/posts/{postId}/delete", pathParams);
    return axiosInstance.patch(url, data, { ...config, params });
  },

  // PATCH /api/admin/programs/{programId} (ProgramAdminController#update)
  patchapiAdminProgramsByProgramId(pathParams = {}, data = {}, params = {}, config = {}) {
    const url = buildUrl("/api/admin/programs/{programId}", pathParams);
    return axiosInstance.patch(url, data, { ...config, params });
  },

  // PATCH /api/admin/refunds/{refundId}/approve (AdminRefundsController#approve)
  patchapiAdminRefundsByRefundIdApprove(pathParams = {}, data = {}, params = {}, config = {}) {
    const url = buildUrl("/api/admin/refunds/{refundId}/approve", pathParams);
    return axiosInstance.patch(url, data, { ...config, params });
  },

  // PATCH /api/admin/refunds/{refundId}/reject (AdminRefundsController#reject)
  patchapiAdminRefundsByRefundIdReject(pathParams = {}, data = {}, params = {}, config = {}) {
    const url = buildUrl("/api/admin/refunds/{refundId}/reject", pathParams);
    return axiosInstance.patch(url, data, { ...config, params });
  },

  // PATCH /api/admin/reports/{reportId} (AdminReportController#decide)
  patchapiAdminReportsByReportId(pathParams = {}, data = {}, params = {}, config = {}) {
    const url = buildUrl("/api/admin/reports/{reportId}", pathParams);
    return axiosInstance.patch(url, data, { ...config, params });
  },

  // PATCH /api/admin/speakers/{speakerId} (SpeakerAdminController#updateSpeaker)
  patchapiAdminSpeakersBySpeakerId(pathParams = {}, data = {}, params = {}, config = {}) {
    const url = buildUrl("/api/admin/speakers/{speakerId}", pathParams);
    return axiosInstance.patch(url, data, { ...config, params });
  },

  // PATCH /api/admin/users/{id} (AdminUserController#update)
  patchapiAdminUsersById(pathParams = {}, data = {}, params = {}, config = {}) {
    const url = buildUrl("/api/admin/users/{id}", pathParams);
    return axiosInstance.patch(url, data, { ...config, params });
  },

  // POST /api/admin/boards (BoardController#createBoard)
  postapiAdminBoards(pathParams = {}, data = {}, params = {}, config = {}) {
    const url = buildUrl("/api/admin/boards", pathParams);
    return axiosInstance.post(url, data, { ...config, params });
  },

  // POST /api/admin/events (AdminEventOperationController#createEvent)
  postapiAdminEvents(pathParams = {}, data = {}, params = {}, config = {}) {
    const url = buildUrl("/api/admin/events", pathParams);
    return axiosInstance.post(url, data, { ...config, params });
  },

  // POST /api/admin/faqs (AdminFaqController#create)
  postapiAdminFaqs(pathParams = {}, data = {}, params = {}, config = {}) {
    const url = buildUrl("/api/admin/faqs", pathParams);
    return axiosInstance.post(url, data, { ...config, params });
  },

  // POST /api/admin/files/notice (AdminStorageController#uploadNotice)
  postapiAdminFilesNotice(pathParams = {}, data = {}, params = {}, config = {}) {
    const url = buildUrl("/api/admin/files/notice", pathParams);
    return axiosInstance.post(url, data, { ...config, params });
  },

  // POST /api/admin/operations/events/{eventId}/booths/{boothId}/qr/check-in (QrAdminController#checkIn)
  postapiAdminOperationsEventsByEventIdBoothsByBoothIdQrCheckIn(pathParams = {}, data = {}, params = {}, config = {}) {
    const url = buildUrl("/api/admin/operations/events/{eventId}/booths/{boothId}/qr/check-in", pathParams);
    return axiosInstance.post(url, data, { ...config, params });
  },

  // POST /api/admin/operations/events/{eventId}/booths/{boothId}/qr/check-out (QrAdminController#checkOut)
  postapiAdminOperationsEventsByEventIdBoothsByBoothIdQrCheckOut(pathParams = {}, data = {}, params = {}, config = {}) {
    const url = buildUrl("/api/admin/operations/events/{eventId}/booths/{boothId}/qr/check-out", pathParams);
    return axiosInstance.post(url, data, { ...config, params });
  },

  // POST /api/admin/programs (ProgramAdminController#create)
  postapiAdminPrograms(pathParams = {}, data = {}, params = {}, config = {}) {
    const url = buildUrl("/api/admin/programs", pathParams);
    return axiosInstance.post(url, data, { ...config, params });
  },

  // POST /api/admin/refunds/{refundId}/execute (AdminRefundsController#execute)
  postapiAdminRefundsByRefundIdExecute(pathParams = {}, data = {}, params = {}, config = {}) {
    const url = buildUrl("/api/admin/refunds/{refundId}/execute", pathParams);
    return axiosInstance.post(url, data, { ...config, params });
  },

  // POST /api/admin/speakers (SpeakerAdminController#createSpeaker)
  postapiAdminSpeakers(pathParams = {}, data = {}, params = {}, config = {}) {
    const url = buildUrl("/api/admin/speakers", pathParams);
    return axiosInstance.post(url, data, { ...config, params });
  },

  // POST /api/admin/users (AdminUserController#create)
  postapiAdminUsers(pathParams = {}, data = {}, params = {}, config = {}) {
    const url = buildUrl("/api/admin/users", pathParams);
    return axiosInstance.post(url, data, { ...config, params });
  },

  // PUT /api/admin/boards/{boardId} (BoardController#updateBoard)
  putapiAdminBoardsByBoardId(pathParams = {}, data = {}, params = {}, config = {}) {
    const url = buildUrl("/api/admin/boards/{boardId}", pathParams);
    return axiosInstance.put(url, data, { ...config, params });
  },

  // PUT /api/admin/inquiries/{inquiryId}/answer (InquiryController#answer)
  putapiAdminInquiriesByInquiryIdAnswer(pathParams = {}, data = {}, params = {}, config = {}) {
    const url = buildUrl("/api/admin/inquiries/{inquiryId}/answer", pathParams);
    return axiosInstance.put(url, data, { ...config, params });
  },

};
