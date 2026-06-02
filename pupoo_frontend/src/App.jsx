import { lazy, Suspense, useEffect, useState } from "react";
import {
  Routes,
  Route,
  Navigate,
  useLocation,
  useParams,
} from "react-router-dom";
import { useAuth } from "./pages/site/auth/AuthProvider";
import SiteLayout from "./layouts/SiteLayout";
import ScrollToTop from "./ScrollToTop.jsx";
import { adminNoticeApi, getToken, clearToken } from "./api/noticeApi";

import { getSocialJoinState } from "./pages/site/auth/socialJoinStorage";

const Dashboard = lazy(() => import("./pages/admin/dashboard/Dashboard"));
const BoardManage = lazy(() => import("./pages/admin/board/boardManage"));
const NoticeManage = lazy(() => import("./pages/admin/board/Notice"));
const EventManage = lazy(() => import("./pages/admin/event/eventManage"));
const ProgramManage = lazy(() => import("./pages/admin/program/programManage"));
const RealtimeData = lazy(() => import("./pages/admin/realtime/RealtimeData.jsx"));
const PastEvents = lazy(() => import("./pages/admin/past/PastEvents"));
const ZoneManage = lazy(() => import("./pages/admin/zone/zoneManage"));
const ContestManage = lazy(() => import("./pages/admin/contest/contestManage"));
const SessionManage = lazy(() => import("./pages/admin/session/sessionManage"));
const Reviews = lazy(() => import("./pages/admin/board/Reviews"));
const GalleryManage = lazy(() => import("./pages/admin/gallery/Gallery"));
const ParticipantList = lazy(() => import("./pages/admin/participant/ParticipantList"));
const ParticipantInsights = lazy(() => import("./pages/admin/participant/ParticipantInsights"));
const PaymentManage = lazy(() => import("./pages/admin/participant/PaymentManage"));
const AlertManage = lazy(() => import("./pages/admin/participant/AlertManage"));
const RefundManage = lazy(() => import("./pages/admin/refund/RefundManage"));
const ReportManage = lazy(() => import("./pages/admin/report/ReportManage"));
const AdminLogin = lazy(() => import("./pages/admin/shared/AdminLogin"));

const Home = lazy(() => import("./pages/site/home/Home"));

const Login = lazy(() => import("./pages/site/auth/Login"));
const FindPassword = lazy(() => import("./pages/site/auth/FindPassword"));
const ResetPassword = lazy(() => import("./pages/site/auth/ResetPassword"));
const Mypage = lazy(() => import("./pages/site/auth/Mypage"));
const MypageQr = lazy(() => import("./pages/site/auth/MypageQr"));
const MypageProfileEdit = lazy(() => import("./pages/site/auth/MypageProfileEdit"));
const MypagePetEditor = lazy(() => import("./pages/site/auth/MypagePetEditor"));
const JoinSelect = lazy(() => import("./pages/site/auth/join/JoinSelect"));
const JoinNormal = lazy(() => import("./pages/site/auth/join/JoinNormal"));

const KakaoCallback = lazy(() => import("./pages/site/auth/KakaoCallback"));
const KakaoJoin = lazy(() => import("./pages/site/auth/join/KakaoJoin"));
const NaverCallback = lazy(() => import("./pages/site/auth/NaverCallback"));
const NaverJoin = lazy(() => import("./pages/site/auth/join/NaverJoin"));
const GoogleCallback = lazy(() => import("./pages/site/auth/GoogleCallback"));
const GoogleJoin = lazy(() => import("./pages/site/auth/join/GoogleJoin"));

const Checkout = lazy(() => import("./pages/site/payment/Checkout"));
const PaymentApprove = lazy(() => import("./pages/site/payment/PaymentApprove"));
const PaymentCancel = lazy(() => import("./pages/site/payment/PaymentCancel"));
const PaymentFail = lazy(() => import("./pages/site/payment/PaymentFail"));

const Current = lazy(() => import("./pages/site/event/Current"));
const Upcoming = lazy(() => import("./pages/site/event/Upcoming"));
const Closed = lazy(() => import("./pages/site/event/Closed"));
const PreRegister = lazy(() => import("./pages/site/event/PreRegister"));
const EventSchedule = lazy(() => import("./pages/site/event/EventSchedule"));

const Experience = lazy(() => import("./pages/site/program/Experience"));
const Session = lazy(() => import("./pages/site/program/Session"));
const Contest = lazy(() => import("./pages/site/program/Contest"));
const ContestDetailPage = lazy(() => import("./pages/site/program/ContestDetailPage"));
const ProgramAll = lazy(() => import("./pages/site/program/ProgramAll"));
const ProgramStatus = lazy(() => import("./pages/site/program/ProgramStatus"));
const SessionDetail = lazy(() => import("./pages/site/program/SessionDetail"));
const SpeakerDetail = lazy(() => import("./pages/site/program/SpeakerDetail"));

const Apply = lazy(() => import("./pages/site/registration/Apply"));
const ApplyHistory = lazy(() => import("./pages/site/registration/ApplyHistory"));
const PaymentHistory = lazy(() => import("./pages/site/registration/PaymentHistory"));
const QRCheckin = lazy(() => import("./pages/site/registration/QRCheckin"));

const WaitingStatus = lazy(() => import("./pages/site/realtime/WaitingStatus"));
const VoteStatus = lazy(() => import("./pages/site/realtime/VoteStatus"));
const RealtimeDashboard = lazy(() => import("./pages/site/realtime/Dashboard"));
const CheckinStatus = lazy(() => import("./pages/site/realtime/CheckinStatus"));

const FreeBoard = lazy(() => import("./pages/site/community/FreeBoard"));
const FreeBoardDetailPage = lazy(() => import("./pages/site/community/FreeBoardDetailPage"));
const FreeBoardWritePage = lazy(() => import("./pages/site/community/FreeBoardWritePage"));
const Review = lazy(() => import("./pages/site/community/Review"));
const ReviewDetailPage = lazy(() => import("./pages/site/community/ReviewDetailPage"));
const ReviewWritePage = lazy(() => import("./pages/site/community/ReviewWritePage"));
const QnA = lazy(() => import("./pages/site/community/QnA"));
const QnADetailPage = lazy(() => import("./pages/site/community/QnADetailPage"));
const QnAWritePage = lazy(() => import("./pages/site/community/QnAWritePage"));
const Notice = lazy(() => import("./pages/site/community/Notice"));
const NoticeDetailPage = lazy(() => import("./pages/site/community/NoticeDetailPage"));
const CommunityFaq = lazy(() => import("./pages/site/community/Faq"));
const InfoBoard = lazy(() => import("./pages/site/community/InfoBoard"));
const InfoBoardDetailPage = lazy(() => import("./pages/site/community/InfoBoardDetailPage"));
const InfoBoardWritePage = lazy(() => import("./pages/site/community/InfoBoardWritePage"));
const FaqDetailPage = lazy(() => import("./pages/site/community/FaqDetailPage"));
const FreeBoardEditPage = lazy(() => import("./pages/site/community/FreeBoardEditPage"));
const InfoBoardEditPage = lazy(() => import("./pages/site/community/InfoBoardEditPage"));
const QnAEditPage = lazy(() => import("./pages/site/community/QnAEditPage"));
const ReviewEditPage = lazy(() => import("./pages/site/community/ReviewEditPage"));

const PlatformIntro = lazy(() => import("./pages/site/info/PlatformIntro"));
const InfoFAQ = lazy(() => import("./pages/site/info/FAQ"));
const Inquiry = lazy(() => import("./pages/site/info/Inquiry"));
const Location = lazy(() => import("./pages/site/info/Location"));

const AboutUs = lazy(() => import("./pages/site/policy/aboutus"));
const PrivacyPolicy = lazy(() => import("./pages/site/policy/privacypolicy"));
const ServiceGuide = lazy(() => import("./pages/site/policy/serviceguide"));
const TermsOfService = lazy(() => import("./pages/site/policy/termsofservice"));
const EFTTerms = lazy(() => import("./pages/site/policy/EFTTerms"));

const EventGallery = lazy(() => import("./pages/site/gallery/eventgallery"));
const Operation = lazy(() => import("./pages/site/guide/Operation"));
const LocationPage = lazy(() => import("./pages/site/guide/Location"));
const Credits = lazy(() => import("./pages/site/credits/Credits"));

function ComingSoon() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "80px 20px",
        color: "#94A3B8",
      }}
    >
      <div style={{ fontSize: 40, marginBottom: 16 }}>...</div>
      <div
        style={{
          fontSize: 16,
          fontWeight: 700,
          color: "#64748B",
          marginBottom: 6,
        }}
      >
        Preparing
      </div>
      <div style={{ fontSize: 13 }}>This feature will be added soon.</div>
    </div>
  );
}

function PublicOnly({ children }) {
  const { isAuthed } = useAuth();
  const location = useLocation();
  const isSocialJoinPath = location.pathname.startsWith("/auth/join/");
  const hasPendingSocialJoin =
    typeof window !== "undefined" &&
    ["kakao", "naver", "google"].some((provider) => {
      const joinState = getSocialJoinState(provider);
      return !!(joinState?.providerUid || joinState?.signupKey);
    });

  if (isAuthed && (!isSocialJoinPath || !hasPendingSocialJoin)) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }

  return children;
}

function RequireAdmin({ children }) {
  const location = useLocation();
  const [checking, setChecking] = useState(true);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    let mounted = true;

    const validate = async () => {
      const token = getToken();
      if (!token) {
        if (mounted) {
          setAuthed(false);
          setChecking(false);
        }
        return;
      }

      try {
        await adminNoticeApi.list(1, 1);
        if (mounted) setAuthed(true);
      } catch {
        clearToken();
        if (mounted) setAuthed(false);
      } finally {
        if (mounted) setChecking(false);
      }
    };

    validate();
    return () => {
      mounted = false;
    };
  }, [location.pathname]);

  if (checking) return null;

  if (!authed) {
    return (
      <Navigate
        to="/admin/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  return children;
}

function LegacyProgramRedirect({ target }) {
  const { eventId } = useParams();
  return <Navigate to={eventId ? `${target}/${eventId}` : target} replace />;
}

function ParticipantDetailRoute() {
  const { id } = useParams();
  return <ParticipantList initialEventId={id} />;
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Suspense fallback={null}>
        <Routes>
          {/* admin */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route
            path="/admin"
            element={<Navigate to="/admin/dashboard" replace />}
          />
          <Route
            path="/admin/dashboard"
            element={
              <RequireAdmin>
                <Dashboard />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/board"
            element={
              <RequireAdmin>
                <BoardManage />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/board/notice"
            element={
              <RequireAdmin>
                <NoticeManage />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/event"
            element={
              <RequireAdmin>
                <EventManage />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/program"
            element={
              <RequireAdmin>
                <ProgramManage />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/realtime"
            element={
              <RequireAdmin>
                <RealtimeData />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/past"
            element={
              <RequireAdmin>
                <PastEvents />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/zone"
            element={
              <RequireAdmin>
                <ZoneManage />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/contest"
            element={
              <RequireAdmin>
                <ContestManage />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/session"
            element={
              <RequireAdmin>
                <SessionManage />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/board/reviews"
            element={
              <RequireAdmin>
                <Reviews />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/gallery"
            element={
              <RequireAdmin>
                <GalleryManage />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/reports"
            element={
              <RequireAdmin>
                <ReportManage />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/refunds"
            element={
              <RequireAdmin>
                <RefundManage />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/participant"
            element={
              <RequireAdmin>
                <ParticipantList />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/participant/detail"
            element={
              <RequireAdmin>
                <ParticipantList />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/participant/detail/:id"
            element={
              <RequireAdmin>
                <ParticipantDetailRoute />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/participant/checkin"
            element={
              <RequireAdmin>
                <ParticipantInsights mode="checkin" />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/participant/session"
            element={
              <RequireAdmin>
                <ParticipantInsights mode="session" />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/participant/payment"
            element={
              <RequireAdmin>
                <PaymentManage />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/participant/alert"
            element={
              <RequireAdmin>
                <AlertManage />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/participant/stats"
            element={
              <RequireAdmin>
                <ParticipantInsights mode="stats" />
              </RequireAdmin>
            }
          />

          {/* site */}
          <Route element={<SiteLayout />}>
            <Route path="/" element={<Home />} />
            <Route
              path="/auth/login"
              element={
                <PublicOnly>
                  <Login />
                </PublicOnly>
              }
            />
            <Route
              path="/auth/find-password"
              element={
                <PublicOnly>
                  <FindPassword />
                </PublicOnly>
              }
            />
            <Route path="/auth/reset-password" element={<ResetPassword />} />
            <Route path="/auth/mypage" element={<Mypage />} />
            <Route path="/auth/mypage/qr" element={<MypageQr />} />
            <Route path="/auth/mypage/profile" element={<MypageProfileEdit />} />
            <Route path="/auth/mypage/pjrofile" element={<MypageProfileEdit />} />
            <Route path="/auth/mypage/pets/new" element={<MypagePetEditor />} />
            <Route
              path="/auth/mypage/pets/:petId/edit"
              element={<MypagePetEditor />}
            />
            <Route path="/mypage" element={<Mypage />} />
            <Route path="/mypage/qr" element={<MypageQr />} />
            <Route path="/mypage/profile" element={<MypageProfileEdit />} />
            <Route path="/mypage/pjrofile" element={<MypageProfileEdit />} />
            <Route path="/mypage/pets/new" element={<MypagePetEditor />} />
            <Route
              path="/mypage/pets/:petId/edit"
              element={<MypagePetEditor />}
            />
            <Route
              path="/auth/join/joinselect"
              element={
                <PublicOnly>
                  <JoinSelect />
                </PublicOnly>
              }
            />
            <Route
              path="/auth/join/joinnormal"
              element={
                <PublicOnly>
                  <JoinNormal />
                </PublicOnly>
              }
            />
            <Route
              path="/auth/join/joinsocial"
              element={
                <PublicOnly>
                  <Navigate to="/auth/join/joinselect" replace />
                </PublicOnly>
              }
            />
            <Route path="/naver/callback" element={<NaverCallback />} />
            <Route path="/auth/naver/callback" element={<NaverCallback />} />
            <Route path="/auth/kakao/callback" element={<KakaoCallback />} />
            <Route path="/auth/google/callback" element={<GoogleCallback />} />
            <Route
              path="/auth/join/naver"
              element={
                <PublicOnly>
                  <NaverJoin />
                </PublicOnly>
              }
            />
            <Route
              path="/auth/join/google"
              element={
                <PublicOnly>
                  <GoogleJoin />
                </PublicOnly>
              }
            />
            <Route
              path="/auth/join/kakao"
              element={
                <PublicOnly>
                  <KakaoJoin />
                </PublicOnly>
              }
            />
            <Route
              path="/auth/join/kakao/otp"
              element={<Navigate to="/auth/join/kakao" replace />}
            />
            <Route path="/join" element={<JoinSelect />} />
            <Route path="/find-password" element={<FindPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/join/select" element={<JoinSelect />} />
            <Route path="/join/normal" element={<JoinNormal />} />
            <Route
              path="/join/social"
              element={<Navigate to="/auth/join/joinselect" replace />}
            />
            <Route path="/event/current" element={<Current />} />
            <Route path="/event/upcoming" element={<Upcoming />} />
            <Route path="/event/closed" element={<Closed />} />
            <Route path="/event/preregister" element={<PreRegister />} />
            <Route path="/event/eventschedule" element={<EventSchedule />} />
            <Route path="/payment/checkout" element={<Checkout />} />
            <Route path="/payment/approve" element={<PaymentApprove />} />
            <Route path="/payment/cancel" element={<PaymentCancel />} />
            <Route path="/payment/fail" element={<PaymentFail />} />
            <Route
              path="/program/experience/:eventId?"
              element={<Experience />}
            />
            <Route
              path="/program/programstatus/:eventId?"
              element={<ProgramStatus />}
            />
            <Route
              path="/program/current/:eventId?"
              element={<ProgramStatus statusKey="current" />}
            />
            <Route
              path="/program/upcoming/:eventId?"
              element={<ProgramStatus statusKey="upcoming" />}
            />
            <Route
              path="/program/closed/:eventId?"
              element={<ProgramStatus statusKey="closed" />}
            />
            <Route path="/program/session/:eventId?" element={<Session />} />
            <Route
              path="/program/schedule/:eventId?"
              element={<LegacyProgramRedirect target="/program/all" />}
            />
            <Route path="/program/all/:eventId?" element={<ProgramAll />} />
            <Route path="/program/detail" element={<SessionDetail />} />
            <Route path="/program/speaker/detail" element={<SpeakerDetail />} />
            <Route
              path="/program/contest/:eventId/detail/:programId"
              element={<ContestDetailPage />}
            />
            <Route path="/program/contest/:eventId?" element={<Contest />} />
            <Route
              path="/program/booth/:eventId?"
              element={<LegacyProgramRedirect target="/program/experience" />}
            />
            <Route path="/registration/apply" element={<Apply />} />
            <Route path="/registration/applyhistory" element={<ApplyHistory />} />
            <Route
              path="/registration/paymenthistory"
              element={<PaymentHistory />}
            />
            <Route path="/registration/qrcheckin" element={<QRCheckin />} />
            <Route
              path="/realtime/dashboard/:eventId?"
              element={<RealtimeDashboard />}
            />
            <Route
              path="/realtime/checkinstatus/:eventId?"
              element={<CheckinStatus />}
            />
            <Route
              path="/realtime/votestatus/:eventId?"
              element={<VoteStatus />}
            />
            <Route
              path="/realtime/waitingstatus/:eventId?"
              element={<WaitingStatus />}
            />
            <Route path="/community/freeboard" element={<FreeBoard />} />
            <Route
              path="/community/freeboard/write"
              element={<FreeBoardWritePage />}
            />
            <Route
              path="/community/freeboard/:postId/edit"
              element={<FreeBoardEditPage />}
            />
            <Route
              path="/community/freeboard/:postId"
              element={<FreeBoardDetailPage />}
            />
            <Route path="/community/info" element={<InfoBoard />} />
            <Route
              path="/community/info/write"
              element={<InfoBoardWritePage />}
            />
            <Route
              path="/community/info/:postId/edit"
              element={<InfoBoardEditPage />}
            />
            <Route
              path="/community/info/:postId"
              element={<InfoBoardDetailPage />}
            />
            <Route path="/community/review" element={<Review />} />
            <Route path="/community/review/write" element={<ReviewWritePage />} />
            <Route
              path="/community/review/:reviewId/edit"
              element={<ReviewEditPage />}
            />
            <Route
              path="/community/review/:reviewId"
              element={<ReviewDetailPage />}
            />
            <Route path="/community/qna" element={<QnA />} />
            <Route path="/community/qna/write" element={<QnAWritePage />} />
            <Route path="/community/qna/:qnaId/edit" element={<QnAEditPage />} />
            <Route path="/community/qna/:qnaId" element={<QnADetailPage />} />
            <Route path="/community/notice" element={<Notice />} />
            <Route
              path="/community/notice/:noticeId"
              element={<NoticeDetailPage />}
            />
            <Route path="/community/faq" element={<CommunityFaq />} />
            <Route path="/community/faq/:postId" element={<FaqDetailPage />} />
            <Route path="/info/intro" element={<PlatformIntro />} />
            <Route path="/info/faq" element={<InfoFAQ />} />
            <Route path="/info/inquiry" element={<Inquiry />} />
            <Route path="/info/location" element={<Location />} />
            <Route path="/policy/aboutus" element={<AboutUs />} />
            <Route path="/policy/privacypolicy" element={<PrivacyPolicy />} />
            <Route path="/policy/serviceguide" element={<ServiceGuide />} />
            <Route path="/policy/termsofservice" element={<TermsOfService />} />
            <Route path="/policy/eftterms" element={<EFTTerms />} />
            <Route path="/gallery/eventgallery" element={<EventGallery />} />
            <Route path="/guide/location" element={<LocationPage />} />
            <Route path="/guide/operation" element={<Operation />} />
            <Route path="/credits" element={<Credits />} />
            <Route
              path="/guide/timetable"
              element={<Navigate to="/event/eventschedule" replace />}
            />
          </Route>
        </Routes>
      </Suspense>
    </>
  );
}
