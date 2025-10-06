import React from "react";
import MainPage from "../../ui/MainPage";
import CreateContentPage from "/app/ui/CreateContentPage/index";
import LoginPage from "/app/ui/LoginPage";
import NotFoundPage from "/app/ui/NotFoundPage";
import SignupPage from "/app/ui/SignupPage";
import UserProfilePage from "/app/ui/UserProfilePage";
import FeedPage from "/app/ui/FeedPage";
import BrandManagementPage from "/app/ui/BrandManagementPage";
import BillingPage from "/app/ui/BillingPage";

/**
 * User does not have to be logged in to view these routes
 */
export const publicRoutes = {
	// NOTE: Route order matters, root routes should be below their children
	login: {
		path: "/login",
		element: (<LoginPage />) as React.ReactElement,
	},
	signup: {
		path: "/signup",
		element: (<SignupPage />) as React.ReactElement,
	},
	userProfile: {
		path: "/profile/:username",
		element: (<UserProfilePage />) as React.ReactElement,
	},
	feed: {
		path: "/feed",
		element: (<FeedPage />) as React.ReactElement,
	},
	home: {
		path: "/",
		element: (<MainPage />) as React.ReactElement,
	},
	default: {
		path: "*",
		element: (<NotFoundPage />) as React.ReactElement,
	},
};

/**
 * User has to be logged in to view these routes
 */
export const protectedRoutes = {
	createContent: {
		path: "/criar-conteudo",
		element: (<CreateContentPage />) as React.ReactElement,
	},
	editContent: {
		path: "/editar-conteudo/:id",
		element: (<CreateContentPage />) as React.ReactElement,
	},
	brands: {
		path: "/marcas",
		element: (<BrandManagementPage />) as React.ReactElement,
	},
	billing: {
		path: "/assinatura",
		element: (<BillingPage />) as React.ReactElement,
	},
};

// NOTE: Do not add a home path here to prevent children routes from being blocked
export type RouteDef = { path: string; element: React.ReactElement };
export const adminRoutes: Record<string, RouteDef> = {};
