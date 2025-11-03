import React from "react";
import MainPage from "/app/ui/pages/MainPage";
import CreateContentPage from "/app/ui/pages/CreateContentPage";
import LoginPage from "/app/ui/pages/LoginPage";
import NotFoundPage from "/app/ui/pages/NotFoundPage";
import SignupPage from "/app/ui/pages/SignupPage";
import UserProfilePage from "/app/ui/pages/UserProfilePage";
import BrandManagementPage from "/app/ui/pages/BrandManagementPage";
import FeedPage from "/app/ui/pages/FeedPage";
import ForgotPasswordPage from "/app/ui/ForgotPasswordPage";
import ResetPasswordPage from "/app/ui/ResetPasswordPage";

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
	forgotPassword: {
		path: "/forgot-password",
		element: (<ForgotPasswordPage />) as React.ReactElement,
	},
	resetPassword: {
		path: "/reset-password/:token",
		element: (<ResetPasswordPage />) as React.ReactElement,
	},
	userProfile: {
		path: "/profile/:username",
		element: (<UserProfilePage />) as React.ReactElement,
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
	feed: {
		path: "/feed",
		element: (<FeedPage />) as React.ReactElement,
	},
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
};

// NOTE: Do not add a home path here to prevent children routes from being blocked
export type RouteDef = { path: string; element: React.ReactElement };
export const adminRoutes: Record<string, RouteDef> = {};
