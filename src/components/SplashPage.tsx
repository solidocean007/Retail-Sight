// SplashPage.tsx
import { useNavigate } from "react-router-dom";
import "./splashPage.css"; // Make sure this reflects the styles below
import { MutableRefObject, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { selectUser } from "../Slices/userSlice";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { db } from "../utils/firebase";
import { PostType, PostWithID } from "../utils/types";
import { setPosts } from "../Slices/postsSlice";
import {
  addPostsToIndexedDB,
  getPostsFromIndexedDB,
} from "../utils/database/indexedDBUtils";
import { fetchInitialPostsBatch } from "../thunks/postsThunks";
import { useAppDispatch } from "../utils/store";
import { useRef } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet";

const SplashPage = () => {
  const user = useSelector(selectUser);
  const currentUserCompany = user?.company;
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const POSTS_BATCH_SIZE = 10;
  const [isMenuOpen, setMenuOpen] = useState(false);

  const toggleMenu = () => {
    setMenuOpen(!isMenuOpen);
  };

  // Reference for scrolling into view
  const sectionTwoRef = useRef(null);
  const sectionThreeRef = useRef(null);
  const sectionFourRef = useRef(null);
  const sectionFiveRef = useRef(null);
  const sectionSixRef = useRef(null);

  const scrollToRef = (ref: MutableRefObject<HTMLElement | null>) => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // skip this page if a user is already logged in
  useEffect(() => {
    if (user) {
      navigate("/user-home-page");
    }
  }, [user, navigate]);

  // load indexDB posts or fetch from firestore
  useEffect(() => {
    const noUserLoggedInFetch = async () => {
      // need to check indexedDB before doing this in case this user has visited the site before.
      const publicPostsQuery = query(
        collection(db, "posts"),
        where("visibility", "==", "public"),
        orderBy("timestamp", "desc"),
        limit(POSTS_BATCH_SIZE)
      );
      const querySnapshot = await getDocs(publicPostsQuery);

      const publicPosts: PostWithID[] = querySnapshot.docs
        .map((doc) => {
          const postData: PostType = doc.data() as PostType;
          return {
            ...postData,
            id: doc.id,
          };
        })
        .filter((post) => post.visibility === "public");
      dispatch(setPosts(publicPosts as PostWithID[]));
      addPostsToIndexedDB(publicPosts);
    };

    if (user === null) {
      noUserLoggedInFetch().catch(console.error);
      return;
    }
    const loadPosts = async () => {
      try {
        const cachedPosts = await getPostsFromIndexedDB();
        if (cachedPosts && cachedPosts.length > 0) {
          dispatch(setPosts(cachedPosts));
        } else if (currentUserCompany) {
          dispatch(
            fetchInitialPostsBatch({ POSTS_BATCH_SIZE, currentUserCompany })
          ).then((action) => {
            if (fetchInitialPostsBatch.fulfilled.match(action)) {
              addPostsToIndexedDB(action.payload.posts);
            }
          });
        }
      } catch (error) {
        if (currentUserCompany) {
          dispatch(
            fetchInitialPostsBatch({ POSTS_BATCH_SIZE, currentUserCompany })
          );
        }
      }
    };

    loadPosts();
  }, [user, dispatch, currentUserCompany]);

  return (
    <>
      <Helmet>
        <title>Displaygram: Retail Display Management Simplified</title>
        <meta
          name="description"
          content="Welcome to Displaygram - your gateway to effortless retail display management. Learn about our services, explore features, and join our community. Manage, archive, and share retail displays with innovation at your fingertips."
        />
        <meta
          name="keywords"
          content="Displaygram, retail management, display sharing, retail display, store management, visual merchandising"
        />
        <link rel="canonical" href="https://displaygram.com/splash" />
        <meta
          property="og:title"
          content="Displaygram: Retail Display Management Simplified"
        />
        <meta
          property="og:description"
          content="Step into the world of Displaygram and transform your retail display management. Join us to streamline, share, and succeed in your retail endeavors."
        />
        <meta property="og:url" content="https://displaygram.com/splash" />
        <meta property="og:type" content="website" />
        <meta
          property="og:image"
          content="https://firebasestorage.googleapis.com/path-to-your-og-image.jpg"
        />
        <meta name="twitter:card" content="summary_large_image" />
        <meta
          name="twitter:title"
          content="Displaygram: Retail Display Management Simplified"
        />
        <meta
          name="twitter:description"
          content="Discover the ease of managing retail displays with Displaygram. Share, manage, and innovate in your retail strategy."
        />
        <meta
          name="twitter:image"
          content="https://firebasestorage.googleapis.com/path-to-your-twitter-image.jpg"
        />
        <meta name="twitter:url" content="https://displaygram.com/splash" />
      </Helmet>

      <div className="splash-container">
        <nav className="top-nav">
          <div className="logo-box">
            <img
              src="https://firebasestorage.googleapis.com/v0/b/retail-sight.appspot.com/o/assets%2Fdisplaygramlogo.svg?alt=media&token=991cea53-8831-422b-b9cd-2a308040d7bd"
              alt=""
            />
            <h1>Displaygram</h1>
          </div>
          <div className="navbar">
            <ul className={isMenuOpen ? "isMenuOpen" : ""}>
              <li>
                <a
                  onClick={() => {
                    toggleMenu();
                    scrollToRef(sectionTwoRef);
                  }}
                >
                  About Our Service
                </a>
              </li>
              <li>
                <a
                  onClick={() => {
                    toggleMenu();
                    scrollToRef(sectionThreeRef);
                  }}
                >
                  Features
                </a>
              </li>
              <li>
                <a
                  onClick={() => {
                    toggleMenu();
                    scrollToRef(sectionFourRef);
                  }}
                >
                  Pricing
                </a>
              </li>
              <li>
                <a
                  onClick={() => {
                    toggleMenu();
                    scrollToRef(sectionFiveRef);
                  }}
                >
                  Security
                </a>
              </li>
            </ul>
          </div>

          <div className="splash-menu-button" onClick={toggleMenu}>
            <button>{isMenuOpen ? "✕" : "☰"}</button>
          </div>
        </nav>
        <main className="splash-main">
          <section className="first-section">
            <div className="first-image-box">
              <img
                src="https://firebasestorage.googleapis.com/v0/b/retail-sight.appspot.com/o/assets%2FabstractImageinsert.png?alt=media&token=2951defe-f44f-425c-b9f9-4c6cd8edbd60"
                alt=""
              />
            </div>

            <div className="first-content">
              <hgroup>
                <h2>Welcome to Displaygram</h2>
                <h3>Discover and share retail success.</h3>
              </hgroup>
              <p>
                Our platform revolutionizes how retail teams, suppliers, and
                networks exchange merchandising success. Skip the clutter of
                texts and emails; quickly archive and replicate winning store
                displays at no cost. Your digital portfolio for retail
                excellence – accessible anytime, by your whole team.
              </p>
              <div className="content-button-box">
                <Link to="/user-home-page" className="enter-site-btn">
                  Start Now
                </Link>
              </div>
            </div>
          </section>

          <section ref={sectionTwoRef} className="second-section">
            <div className="second-content">
              <h3>About Our Service</h3>
              <p>
                Capture in-store displays. Upload images along with critical
                details like product names and quantities. Share with your team
                in real-time. Opt for company-exclusive visibility or share your
                success broadly with unique hashtags. It’s your choice, your
                control.
              </p>
              <div className="content-button-box">
                <Link to="/about" className="enter-site-btn">
                  Learn More
                </Link>
              </div>
            </div>
            <div className="second-image-box">
              <img
                src="https://firebasestorage.googleapis.com/v0/b/retail-sight.appspot.com/o/assets%2Fgrocery-line-drawing-edited_200x200.png?alt=media&token=055681ef-0cd1-4049-9dd5-57d935e30b6b"
                alt=""
              />
            </div>
          </section>

          <section ref={sectionThreeRef} className="section-three">
            <div className="hero-content-left">
              <div className="features-image-box">
                <img
                  className="features-image"
                  // src="https://images.unsplash.com/photo-1563906267088-b029e7101114?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
                  src="https://firebasestorage.googleapis.com/v0/b/retail-sight.appspot.com/o/assets%2Fgrocery-products.jpg?alt=media&token=67eb96e6-1a55-482d-92c3-5b3901ce4b3e"
                  alt=""
                />
                <Link to="/about" className="features-button enter-site-btn">
                  See Our Features
                </Link>
              </div>
            </div>
            <div className="hero-content-right features-text-box">
              <h3>Features</h3>
              <p>
                Find displays that matter to you. Our intuitive filters allow
                you to search by location, retail channel, or product category.
                Whatever you are looking for, find exactly what you need — from
                beer to bread and everything in between..
              </p>
            </div>
          </section>

          <section
            ref={sectionFourRef}
            className="hero-content hero-full fourth-block"
            id="pricing"
          >
            <div className="hero-content-left fourth-insert">
              <h3>Pricing:</h3>
              <p>
                Our platform is committed to providing value at no cost to you.
                Premium features may become available in the future.
              </p>
              <div className="content-button-box">
                <Link to="/sign-up-login" className="enter-site-btn">
                  Join for free
                </Link>
              </div>
            </div>
          </section>

          <section ref={sectionFiveRef} className="fifth-section">
            <div className="fifth-content">
              <h3>Security and Compliance</h3>
              <p>
                Your security is our priority. Passwords are protected by
                Firebase, Google's trusted authentication service. Images are
                securely stored in Firestore, ensuring your data rests on
                reliable, world-class infrastructure.
              </p>
              <div className="content-button-box">
                <Link to="/sign-up-login" className="enter-site-btn">
                  Sign Up Now
                </Link>
              </div>
            </div>
            <div className="fifth-image-box">
              <img
                src="https://firebasestorage.googleapis.com/v0/b/retail-sight.appspot.com/o/assets%2Fearthdesign.png?alt=media&token=65c60866-6c35-4587-997b-a07042b900df"
                alt="secure earth"
              />
            </div>
          </section>

          <section ref={sectionSixRef} className="last-block">
            <div className="last-block">
              <h3>Start Now</h3>
              <p>
                Elevate your team’s performance, share your retail story today.
              </p>
              <div className="content-button-box">
                <Link to="/sign-up-login" className="enter-site-btn">
                  Sign Up Now
                </Link>
              </div>
            </div>
          </section>
        </main>
      </div>
    </>
  );
};

export default SplashPage;
