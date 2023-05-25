const express = require("express");
const router = express.Router();
const Post = require("../models/posts");

const date = require("date-and-time");

const now = new Date();
const UTC = date.addHours(now, 3);
const dateNtime = date.format(UTC, "DD/MM/YYYY HH:mm:ss", true);

router.post("/", isAuthenticated, (req, res) => {
  const postContent = req.body.post;

  const newPost = new Post({
    username: req.session.username,
    content: postContent,
    timestamp: dateNtime,
  });

  newPost
    .save()
    .then(() => {
      console.log("Post saved:", newPost);
      res.redirect("/");
    })
    .catch((error) => {
      console.error("Error saving post:", error);
      res.redirect("/");
    });
});

router.get("/post/:postId", isAuthenticated, (req, res) => {
  const postId = req.params.postId;

  Post.findById(postId)
    .then((post) => {
      if (!post) {
        return res.status(404).send("Post not found");
      }
      res.render("post.ejs", { post: post });
    })
    .catch((error) => {
      console.error(error);
      res.status(500).send("Internal Server Error");
    });
});

// This is for posting a comment on a particular post
router.post("/post/:postId", isAuthenticated, async (req, res) => {
  const postId = req.params.postId;
  const commentContent = req.body.content;

  try {
    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    const comment = {
      username: req.session.username,
      content: commentContent,
      timestamp: dateNtime,
      comlikedBy: [],
      comdislikedBy: [],
    };
    post.comments.push(comment);

    await post.save();

    res.redirect(`/post/${postId}`);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/post/:postId/:commentId/like", isAuthenticated, async (req, res) => {
    try {
      const postId = req.params.postId;
      const commentId = req.params.commentId;

      const post = await Post.findById(postId);
      const comment = post.comments.id(commentId);

      if (comment.comlikedBy.includes(req.session.username)) {
        return res.redirect(req.headers.referer);
      }
      if (comment.comdislikedBy.includes(req.session.username)) {
        // If the user has already liked the comment and decides to dislike it,
        // It would take away the user from the comlikedBy array.
        comment.comdislikedBy = comment.comdislikedBy.filter(
          (user) => user !== req.session.username
        );
        comment.comlikedBy.push(req.session.username);
      } else {
        comment.comlikedBy.push(req.session.username);
      }
      await post.save();
      res.redirect(req.headers.referer);
    } catch (error) {
      res.status(500).send("Internal Server Error");
    }
  }
);

router.post("/post/:postId/:commentId/dislike", isAuthenticated, async (req, res) => {
  try {
    const postId = req.params.postId;
    const commentId = req.params.commentId;

    const post = await Post.findById(postId);
    const comment = post.comments.id(commentId);

    if (comment.comdislikedBy.includes(req.session.username)) {
      return res.redirect(req.headers.referer);
    }
    if (comment.comlikedBy.includes(req.session.username)) {
      // If the user has already liked the comment and decides to like it,
      // It would take away the user from the comdislikedBy array.
      comment.comlikedBy = comment.comlikedBy.filter(
        (user) => user !== req.session.username
      );
      comment.comdislikedBy.push(req.session.username);
    } else {
      comment.comdislikedBy.push(req.session.username);
    }
    await post.save();
    res.redirect(req.headers.referer);
  } catch (error) {
    res.status(500).send("Internal Server Error");
  }
}
);

router.post("/post/:postId/like", isAuthenticated, async (req, res) => {
  try {
    const postId = req.params.postId;
    const post = await Post.findById(postId);
    //  Let's check if the user liking the post has already liked it.
    if (post.likedBy.includes(req.session.username)) {
      return res.redirect(req.headers.referer);
    }
    if (post.dislikedBy.includes(req.session.username)) {
      // If the user has liked the post and decides to dislike, it will take the like away and add the dislike instead
      post.dislikedBy = post.dislikedBy.filter(
        (user) => user !== req.session.username
      );
      post.likedBy.push(req.session.username);
    } else {
      post.likedBy.push(req.session.username);
    }
    await post.save();
    res.redirect(req.headers.referer);
  } catch (error) {
    res.status(500).send("Internal Server Error");
  }
});

router.post("/post/:postId/dislike", isAuthenticated, async (req, res) => {
  try {
    const postId = req.params.postId;
    const post = await Post.findById(postId);
    // Check if the user has already disliked the post
    if (post.dislikedBy.includes(req.session.username)) {
      return res.redirect(req.headers.referer);
    }
    if (post.likedBy.includes(req.session.username)) {
      // If the user has liked the post and decides to dislike, it will take the like away and add the dislike instead
      post.likedBy = post.likedBy.filter(
        (user) => user !== req.session.username
      );
      post.dislikedBy.push(req.session.username);
    } else {
      post.dislikedBy.push(req.session.username);
    }
    await post.save();
    res.redirect(req.headers.referer);
  } catch (error) {
    res.status(500).send("Internal Server Error");
  }
});

function isAuthenticated(req, res, next) {
  if (req.session && req.session.username) {
    return next();
  }
  res.redirect("/login");
}

module.exports = router;
