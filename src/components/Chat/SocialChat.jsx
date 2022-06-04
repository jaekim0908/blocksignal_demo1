import React, { useEffect, useState } from "react";
import { StreamChat } from "stream-chat";
import { Chat, Channel, ChannelList } from "stream-chat-react";
import { useChecklist } from "./ChecklistTasks";
import "./socialchat.css";
import "@stream-io/stream-chat-css/dist/css/index.css";
import { getEllipsisTxt } from "helpers/formatters";

import {
  CreateChannel,
  CustomMessage,
  MessagingChannelList,
  MessagingChannelPreview,
  MessagingInput,
  MessagingThreadHeader,
} from "..";

import { getRandomImage } from "../../assets";
import { ChannelInner } from "../ChannelInner/ChannelInner";
//import { useMoralis, useMoralisSolanaApi, useMoralisSolanaCall } from "react-moralis";
import { useMoralis } from "react-moralis";
const GiphyContext = React.createContext({});

const urlParams = new URLSearchParams(window.location.search);
const apiKey = process.env.REACT_APP_STREAM_KEY;
const targetOrigin = urlParams.get("target_origin") || process.env.REACT_APP_TARGET_ORIGIN;
const noChannelNameFilter = urlParams.get("no_channel_name_filter") || false;
const skipNameImageSet = urlParams.get("skip_name_image_set") || false;

const SocialChat = () => {
  const { account, isAuthenticated, user } = useMoralis();
  const [chatClient, setChatClient] = useState(null);
  const [giphyState, setGiphyState] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isMobileNavVisible, setMobileNav] = useState(false);
  const [theme, setTheme] = useState("dark");
  const userToConnect = {
    id: account ?? user.get("solAddress"),
    name: getEllipsisTxt(account ?? user.get("solAddress"), 6),
    image: getRandomImage(),
  };

  if (skipNameImageSet) {
    delete userToConnect.name;
    delete userToConnect.image;
  }

  useChecklist(chatClient, targetOrigin);

  useEffect(() => {
    const initChat = async () => {
      const client = StreamChat.getInstance(apiKey, {
        enableInsights: true,
        enableWSFallback: true,
      });

      userToConnect.id = account ?? user.get("solAddress");
      await client.connectUser(userToConnect, client.devToken(account ?? user.get("solAddress")));
      setChatClient(client);
    };

    initChat();

    return () => chatClient?.disconnectUser();
  }, []); // eslint-disable-line

  useEffect(() => {
    const handleThemeChange = ({ data, origin }) => {
      // handle events only from trusted origin
      if (origin === targetOrigin) {
        if (data === "light" || data === "dark") {
          setTheme(data);
        }
      }
    };

    window.addEventListener("message", handleThemeChange);
    return () => window.removeEventListener("message", handleThemeChange);
  }, []);

  useEffect(() => {
    const mobileChannelList = document.querySelector("#mobile-channel-list");
    if (isMobileNavVisible && mobileChannelList) {
      mobileChannelList.classList.add("show");
      document.body.style.overflow = "hidden";
    } else if (!isMobileNavVisible && mobileChannelList) {
      mobileChannelList.classList.remove("show");
      document.body.style.overflow = "auto";
    }
  }, [isMobileNavVisible]);

  useEffect(() => {
    /*
     * Get the actual rendered window height to set the container size properly.
     * In some browsers (like Safari) the nav bar can override the app.
     */
    const setAppHeight = () => {
      const doc = document.documentElement;
      doc.style.setProperty("--app-height", `${window.innerHeight}px`);
    };

    setAppHeight();

    window.addEventListener("resize", setAppHeight);
    return () => window.removeEventListener("resize", setAppHeight);
  }, []);

  const toggleMobile = () => setMobileNav(!isMobileNavVisible);

  const giphyContextValue = { giphyState, setGiphyState };

  if ((!account && !user) || !isAuthenticated) return null;

  if (!chatClient) return null;

  const filters = noChannelNameFilter
    ? { type: "messaging", members: { $in: [account] } }
    : { type: "messaging", name: "BlockSingnal Demo", demo: "BlockSignal" };

  const options = { state: true, watch: true, presence: true, limit: 8 };

  const sort = {
    last_message_at: -1,
    updated_at: -1,
  };

  return (
    <Chat client={chatClient} theme={`messaging ${theme}`}>
      <div id="mobile-channel-list" onClick={toggleMobile}>
        <ChannelList
          filters={filters}
          sort={sort}
          options={options}
          List={(props) => (
            <MessagingChannelList {...props} onCreateChannel={() => setIsCreating(!isCreating)} />
          )}
          Preview={(props) => <MessagingChannelPreview {...props} {...{ setIsCreating }} />}
        />
      </div>
      <div style={{ width: "90%" }}>
        <Channel
          Input={MessagingInput}
          maxNumberOfFiles={10}
          Message={CustomMessage}
          multipleUploads={true}
          ThreadHeader={MessagingThreadHeader}
          TypingIndicator={() => null}
        >
          {isCreating && (
            <CreateChannel toggleMobile={toggleMobile} onClose={() => setIsCreating(false)} />
          )}
          <GiphyContext.Provider value={giphyContextValue}>
            <ChannelInner theme={theme} toggleMobile={toggleMobile} />
          </GiphyContext.Provider>
        </Channel>
      </div>
    </Chat>
  );
};

export default SocialChat;
export { GiphyContext };
