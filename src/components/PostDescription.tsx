import styles from './PostDescription.module.css';

interface PostDescriptionProps {
  description?: string;
  getPostsByTag: (hashTag: string) => void;
}

export const PostDescription: React.FC<PostDescriptionProps> = ({ description, getPostsByTag }) => {
  const words = description?.split(/\s+/);

  return (
    <>
      {words?.map((word, index) => {
        if (word.startsWith("#")) {
          return (
            <span key={index} className={styles.hashtag} onClick={() => getPostsByTag(word)}>
              {word}
            </span>
          );
        }
        return word + " ";
      })}
    </>
  );
};

