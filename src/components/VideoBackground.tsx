const VideoBackground = () => {
  return (
    <>
      <div className="video-overlay" />
      <video autoPlay muted loop className="video-bg">
        <source src="https://files.catbox.moe/gu5ge1.mp4" type="video/mp4" />
      </video>
    </>
  );
};

export default VideoBackground;
