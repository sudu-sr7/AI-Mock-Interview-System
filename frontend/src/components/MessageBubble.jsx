function MessageBubble({
  role,
  content,
}) {

  return (
    <div
      className={
        role === "user"
          ? "user-message"
          : "ai-message"
      }
    >
      {content}
    </div>
  );
}

export default MessageBubble;