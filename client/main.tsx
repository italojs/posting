import { Meteor } from "meteor/meteor";
import React from "react";
import { createRoot } from "react-dom/client";
import App from "/app/ui/pages/App";
import "/app/utils/accountsConfig";

Meteor.startup(() => {
	const container = document.getElementById("react-target");
	const root = createRoot(container!);
	root.render((<App />) as React.ReactNode);
});
