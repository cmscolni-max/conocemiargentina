import { useState, useEffect } from 'react';
import { InAppNotification, SocialPost, UserFriend } from '../types';
import { notify } from '../services/notificationCenter';
import { cumbreApi } from '../services/cumbreApi';

export const useSocialViewModel = (userName: string, userAvatar: string, profileId: string | null = null, enabled = true) => {
  const toHandle = (name: string) => `@${name.trim().toLowerCase().replace(/\s+/g, '_')}`;
  const currentUserHandle = userName ? toHandle(userName) : '@usuario';
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [friends, setFriends] = useState<UserFriend[]>([]);
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [postType, setPostType] = useState<'post' | 'snapshot'>('post');
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [isLoadingSocial, setIsLoadingSocial] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const load = async (showLoader = true) => {
      try {
        if (showLoader) setIsLoadingSocial(true);
        const [postsResult, friendsResult, notificationsResult] = await Promise.allSettled([
          cumbreApi.getPosts(),
          cumbreApi.getFriends(profileId),
          profileId ? cumbreApi.getNotifications(profileId) : Promise.resolve([]),
        ]);
        if (cancelled) return;
        if (postsResult.status === 'fulfilled') {
          setPosts(postsResult.value);
        } else {
          console.error('Error loading posts from DB:', postsResult.reason);
        }
        if (friendsResult.status === 'fulfilled') {
          setFriends(friendsResult.value);
        } else {
          console.error('Error loading friends from DB:', friendsResult.reason);
        }
        if (notificationsResult.status === 'fulfilled') {
          setNotifications(notificationsResult.value);
        } else {
          console.error('Error loading notifications from DB:', notificationsResult.reason);
        }
      } catch (error) {
        console.error('Unexpected error loading social data from DB:', error);
      } finally {
        if (!cancelled && showLoader) setIsLoadingSocial(false);
      }
    };
    load(true);
    if (!profileId) {
      return () => {
        cancelled = true;
      };
    }

    const notificationsChannel = cumbreApi.subscribeToUserNotifications(profileId, () => {
      void load(false);
    });
    const socialChannel = cumbreApi.subscribeToSocialChanges(profileId, () => {
      void load(false);
    });
    const handleRefresh = () => {
      if (document.visibilityState === 'hidden') return;
      void load(false);
    };
    window.addEventListener('focus', handleRefresh);
    window.addEventListener('pageshow', handleRefresh);
    document.addEventListener('visibilitychange', handleRefresh);

    return () => {
      cancelled = true;
      window.removeEventListener('focus', handleRefresh);
      window.removeEventListener('pageshow', handleRefresh);
      document.removeEventListener('visibilitychange', handleRefresh);
      void notificationsChannel.unsubscribe();
      void socialChannel.unsubscribe();
    };
  }, [profileId, enabled]);

  const handleCreatePost = () => {
    if (!newPostContent.trim()) return;
    const newPost: SocialPost = {
      id: Date.now().toString(),
      userId: 'me',
      userName: userName || 'Usuario',
      userAvatar: userAvatar,
      content: newPostContent,
      timestamp: 'Ahora',
      likes: 0,
      comments: 0,
      type: postType
    };
    setPosts([newPost, ...posts]);
    if (profileId) {
      cumbreApi.sendPost(profileId, newPostContent).catch((error) => {
        console.error('Error creating post in DB:', error);
      });
    }
    setNewPostContent('');
    setIsCreatingPost(false);
  };

  const sendFriendRequest = (id: string) => {
    const friend = friends.find((f) => f.id === id);
    if (!friend || friend.isProvider || friend.isFriend || friend.friendStatus === 'sent') return false;

    setFriends((prev) =>
      prev.map((f) =>
        f.id === id
          ? {
              ...f,
              friendStatus: 'sent',
              isFriend: false,
            }
          : f
      )
    );

    notify(
      setNotifications,
      {
        id: `req-out-${id}-${Date.now()}`,
        title: 'Nueva solicitud de amistad',
        description: `${userName || 'Usuario'} quiere seguirte.`,
        type: 'friend_request',
        friendId: id,
        recipientHandles: [toHandle(friend.name)],
      },
      { createdAt: 'Ahora', push: true }
    );
    if (profileId) {
      cumbreApi.sendFriendRequest(profileId, id).catch((error) => {
        console.error('Error sending friend request in DB:', error);
      });
    }
    return true;
  };

  const acceptFriendRequest = async (id: string) => {
    const friend = friends.find((f) => f.id === id);
    if (!friend || friend.friendStatus !== 'received') return;

    const previousFriends = friends;
    setFriends((prev) =>
      prev.map((f) =>
        f.id === id
          ? {
              ...f,
              isFriend: true,
              friendStatus: 'friends',
            }
          : f
      )
    );

    notify(
      setNotifications,
      {
        id: `acc-${id}-${Date.now()}`,
        title: 'Solicitud aceptada',
        description: `${userName || 'Usuario'} aceptó tu solicitud de amistad.`,
        type: 'friend_accepted',
        friendId: id,
        recipientHandles: [toHandle(friend.name)],
      },
      { createdAt: 'Ahora', push: true }
    );
    if (profileId) {
      try {
        await cumbreApi.acceptFriendRequestBetween(id, profileId);
      } catch (error) {
        console.error('Error accepting friend request in DB:', error);
        setFriends(previousFriends);
        return;
      }
    }

    setNotifications((prev) => prev.filter((n) => !(n.type === 'friend_request' && n.friendId === id)));
  };

  const markAllNotificationsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const toggleFollowProvider = (id: string) => {
    setFriends((prev) => prev.map((f) => (f.id === id && f.isProvider ? { ...f, isFollowing: !f.isFollowing } : f)));
    if (profileId) {
      const target = friends.find((f) => f.id === id);
      if (target) {
        cumbreApi.toggleFollow(profileId, id, !target.isFollowing).catch((error) => {
          console.error('Error toggling follow in DB:', error);
        });
      }
    }
  };

  return {
    posts, setPosts,
    friends, setFriends,
    isCreatingPost, setIsCreatingPost,
    newPostContent, setNewPostContent,
    postType, setPostType,
    handleCreatePost,
    sendFriendRequest,
    acceptFriendRequest,
    toggleFollowProvider,
    notifications, setNotifications,
    markAllNotificationsAsRead,
    isLoadingSocial
  };
};
