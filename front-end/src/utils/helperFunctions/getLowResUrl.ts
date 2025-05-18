export   const getLowResUrl = (fullUrl: string) => {
    if (fullUrl.includes("original.jpg")) {
      return fullUrl.replace("original.jpg", "original_200x200.jpg");
    } else if (fullUrl.includes("resized.jpg")) {
      return fullUrl.replace("resized.jpg", "resized_200x200.jpg");
    }
    return fullUrl; // fallback to full res if no match
  };