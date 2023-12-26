import styles from './PostDescription.module.css';

interface PostDescriptionProps {
  description?: string;
  getPostsByTag: (hashTag: string) => void;
}

export const PostDescription: React.FC<PostDescriptionProps> = ({ description, getPostsByTag }) => {
  const words = description?.split(/\s+/);

  const handleHashtagClick = (event: React.MouseEvent<HTMLAnchorElement>, hashtag: string) => {
    event.preventDefault(); // Prevents the default anchor behavior
    getPostsByTag(hashtag);
  };

  return (
    <>
      {words?.map((word, index) => {
        if (word.startsWith("#")) {
          return (
            <span key={index} className={styles.hashtag}>
              <a href="" onClick={(event) => handleHashtagClick(event, word)}>
                {word}
              </a>
            </span>
          );
        }
        return word + " ";
      })}
    </>
  );
};

