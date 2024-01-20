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

  // Function to scroll to a ref (section)
  // const scrollToRef = (ref: MutableRefObject<HTMLElement | null>) => {
  //   if (ref.current) {
  //     window.scrollTo(0, ref.current.offsetTop);
  //   }
  // };

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
        limit(10)
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
      // id: doc.id, ...doc.data() as PostType }));
      dispatch(setPosts(publicPosts as PostWithID[])); // Update your Redux store with the fetched posts
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
          // console.log("getting posts from indexedDB");
          dispatch(setPosts(cachedPosts));
        } else if (currentUserCompany) {
          // console.log("no posts in indexDB");
          // Dispatch the thunk action; Redux handles the promise
          dispatch(
            fetchInitialPostsBatch({ POSTS_BATCH_SIZE, currentUserCompany })
          ).then((action) => {
            if (fetchInitialPostsBatch.fulfilled.match(action)) {
              addPostsToIndexedDB(action.payload.posts);
            }
          });
        }
      } catch (error) {
        // console.error("Error fetching posts from IndexedDB:", error);
        if (currentUserCompany) {
          // Dispatch the thunk action again in case of error.  Is this a safe action to do?
          dispatch(
            fetchInitialPostsBatch({ POSTS_BATCH_SIZE, currentUserCompany })
          );
        }
      }
    };

    loadPosts();
  }, [user, dispatch, currentUserCompany]);

  return (
    <div className="splash-container">
     <nav className="top-nav">
        <ul className={isMenuOpen ? 'isMenuOpen' : ''}>
          <li>
            <a onClick={() => {
              toggleMenu();
              scrollToRef(sectionTwoRef);
            }}>
              About Our Service
            </a>
          </li>
          <li>
            <a onClick={() => {
              toggleMenu();
              scrollToRef(sectionThreeRef);
            }}>
              Features
            </a>
          </li>
          <li>
            <a onClick={() => {
              toggleMenu();
              scrollToRef(sectionFourRef);
            }}>
              Pricing
            </a>
          </li>
          <li>
            <a onClick={() => {
              toggleMenu();
              scrollToRef(sectionFiveRef);
            }}>
              Security
            </a>
          </li>
        </ul>

        <div className="splash-menu-button" onClick={toggleMenu}>
          <button>{isMenuOpen ? '✕' : '☰'}</button>
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
              networks exchange merchandising success. Skip the clutter
              of texts and emails; quickly archive and replicate winning
              store displays at no cost. Your digital portfolio for retail
              excellence – accessible anytime, by your whole team.
            </p>
            <button
              onClick={() => navigate("/user-home-page")}
              className="enter-site-btn"
            >
              Start Now
            </button>
          </div>
        </section>

        <section ref={sectionTwoRef} className="second-section">
          <div className="second-content">
            <h2>About Our Service</h2>
            <p>
              Capture in-store displays. Upload images along with critical
              details like product names and quantities. Share with your team in
              real-time. Opt for company-exclusive visibility or share your
              success broadly with unique hashtags. It’s your choice, your
              control.
            </p>
            <button onClick={() => navigate("/sign-up-login")}>
              Learn More
            </button>
          </div>
          <div className="second-image-box">
            <img
              src="https://firebasestorage.googleapis.com/v0/b/retail-sight.appspot.com/o/assets%2Fgrocery-line-drawing-edited.png?alt=media&token=eb411db4-50d2-4078-a6cd-118e84315715"
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
             <button
              className="features-button"
              onClick={() => scrollToRef(sectionFourRef)}
            >
              See Our Features
            </button>
            </div>
            

           
          </div>
          <div className="hero-content-right features-text-box">
            <h2>Features</h2>
            <p>
              Find displays that matter to you. Our intuitive filters allow you
              to search by location, retail channel, or product category.
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
            <h2>Pricing:</h2>
            <p>
              Our platform is committed to providing value at no cost to you.
              Premium features may become available in the future.
            </p>

            <button onClick={() => navigate("/sign-up-login")}>
              Join for free
            </button>
          </div>
        </section>

        <section
          ref={sectionFiveRef}
          className="fifth-section"
        >
          <div className="fifth-content">
            <h2>Security and Compliance</h2>
            <p>
              Your security is our priority. Passwords are protected by
              Firebase, Google's trusted authentication service. Images are
              securely stored in Firestore, ensuring your data rests on
              reliable, world-class infrastructure.
            </p>

            <button onClick={() => navigate("/sign-up-login")}>
              Sign Up Now
            </button>
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
            <h2>Start Now</h2>
            <p>
              Elevate your team’s performance, share your retail story today.
            </p>

            <button onClick={() => navigate("/sign-up-login")}>
              Sign Up Now
            </button>
          </div>
        </section>
      </main>
    </div>
  );
};

export default SplashPage;
