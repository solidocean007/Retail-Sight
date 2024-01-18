// SplashPage.tsx
import { useNavigate } from "react-router-dom";
import "./splashPage.css"; // Make sure this reflects the styles below
import { MutableRefObject, useEffect } from "react";
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

  // Reference for scrolling into view
  const sectionTwoRef = useRef(null);
  const sectionThreeRef = useRef(null);
  const sectionFourRef = useRef(null);
  const sectionFiveRef = useRef(null);

  // Function to scroll to a ref (section)
  const scrollToRef = (ref: MutableRefObject<T>) =>
    window.scrollTo(0, ref.current.offsetTop);

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
        <ul>
          <li>
            <a href="#about">About Us</a>
          </li>
          <li>
            <a href="#services">Services</a>
          </li>
          <li>
            <a href="#contact" role="button">
              Contact
            </a>
          </li>
        </ul>
      </nav>
      <main className="hero">
        <section className="hero-content">
          <div className="hero-content-left">
            <hgroup>
              <h2>Welcome to Displaygram</h2>
              <h3>Discover and share retail success.</h3>
            </hgroup>
            <p>
              Our platform revolutionizes how retail teams, suppliers, and
              networks exchange visual merchandising success. Skip the clutter
              of texts and emails; seamlessly archive and replicate winning
              store displays at no cost. It’s your digital portfolio for retail
              excellence – accessible anytime, by your whole team.
            </p>
            <button
              onClick={() => navigate("/user-home-page")}
              className="enter-site-btn"
            >
              Start Now
            </button>
          </div>
          <div className="hero-content-right">
            <section className="hero-image">
              <img
                // src="https://images.unsplash.com/photo-1579548122080-c35fd6820ecb?q=80&w=1740&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
                src="src\assets\bluebackground.jpg"
                alt="Dynamic workplace"
              />
              <div className="hero-header">
                <h1>Join for Free!</h1>
              </div>
            </section>
          </div>
        </section>

        <section ref={sectionTwoRef} className="hero-content">
          <div className="hero-content-left">
            <h2>About Our Service</h2>
            <p>
              Capture in-store displays with ease. Upload images along with
              critical details like product names and quantities. Watch as your
              displays come to life for your team in real-time. Opt for
              company-exclusive visibility or share your success broadly with
              unique hashtags. It’s your choice, your control
            </p>
            <img src="path_to_your_unsplash_about_image" alt="About Image" />
            <button onClick={() => scrollToRef(sectionThreeRef)}>
              Learn More
            </button>
          </div>
          <div className="hero-content-right hero-image">
            <img
              src="https://images.unsplash.com/photo-1616596875678-9425439b2f1e?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
              alt=""
            />
          </div>
        </section>

        <section ref={sectionThreeRef} className="hero-content hero-full">
          <img
            src="https://images.unsplash.com/photo-1563906267088-b029e7101114?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
            alt=""
          />
          <div className="hero-content-left hero-content-full">
            <h2>Features</h2>
            <p>
              Find displays that matter to you. Our intuitive filters allow you
              to search by location, retail channel, or product category.
              Whatever you are looking for, find exactly what you need — from
              beer to bread and everything in between..
            </p>
            <img
              src="path_to_your_unsplash_features_image"
              alt="Features Image"
            />
            <button onClick={() => scrollToRef(sectionFourRef)}>
              See Our Features
            </button>
          </div>
          <div className="hero-content-right">
            <img src="" alt="" />
          </div>
        </section>

        <section ref={sectionFourRef} className="hero-content">
          <div className="hero-content-left">
            <h2> FAQs:</h2>
            <p>
              "Is the service free?" "Absolutely. Our platform is committed to
              providing value at no cost to you." "What happens if I delete a
              post?" "Once a post is deleted, it's removed from our platform to
              maintain your display’s exclusivity."
            </p>
            <img
              src="path_to_your_unsplash_testimonials_image"
              alt="Faqs image"
            />
            <button onClick={() => scrollToRef(sectionFiveRef)}>
              Our Community
            </button>
          </div>
          <div className="hero-content-right hero-image">
            <img
              src="https://images.unsplash.com/photo-1454117096348-e4abbeba002c?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
              alt=""
            />
          </div>
        </section>

        <section ref={sectionFiveRef} className="hero-content">
          <div className="hero-content-left">
            <h2>Security and Compliance</h2>
            <p>
              Your security is our priority. Passwords are protected by
              Firebase, Google's trusted authentication service. Images are
              securely stored in Firestore, ensuring your data rests on
              reliable, world-class infrastructure.
            </p>
            <img
              src="path_to_your_unsplash_cta_image"
              alt="Call to Action Image"
            />
            <button onClick={() => navigate("/signup")}>Sign Up Now</button>
          </div>
          <div className="hero-content-right hero-image">
            <img
              src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
              alt=""
            />
          </div>
        </section>

        <section ref={sectionFiveRef} className="hero-content hero-full">
          <div className="hero-content-left hero-content-full">
            <img
              src="https://images.unsplash.com/photo-1425342605259-25d80e320565?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
              alt=""
            />
            <h2>Start Now</h2>
            <p>
              Elevate your team’s performance, share your retail story, and join
              a community of visual merchandising champions today.
            </p>
            <img
              src="path_to_your_unsplash_cta_image"
              alt="Call to Action Image"
            />
            <button onClick={() => navigate("/signup")}>Sign Up Now</button>
          </div>
          <div className="hero-content-right">
            
          </div>
        </section>
      </main>
    </div>
  );
};

export default SplashPage;
