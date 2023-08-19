export const PostDescription = ({ description }: { description: string }) => {
  const words = description.split(/\s+/);
  return (
    <>
      {words.map((word, index) => {
        if (word.startsWith("#")) {
          return (
            <span key={index} className="hashtag" onClick={() => handleHashtagClick(word)}>
              {word}
            </span>
          );
        }
        return word + " ";
      })}
    </>
  );
};
