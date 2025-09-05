// Google API types
declare global {
  interface Window {
    gapi: {
      load: (api: string, callback: () => void) => void;
      auth2: {
        init: (config: {
          client_id: string;
          scope: string;
        }) => Promise<any>;
        getAuthInstance: () => {
          currentUser: {
            get: () => {
              isSignedIn: () => boolean;
              getAuthResponse: () => {
                access_token: string;
              };
            };
          };
          signIn: () => Promise<{
            getAuthResponse: () => {
              access_token: string;
            };
          }>;
        };
      };
    };
  }
}

export {};
