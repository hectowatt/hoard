"use client";

import type { Metadata } from "next";
import React from "react";
import { Inter } from "next/font/google";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v13-appRouter";
import Link from "next/link";
import { useThemeMode } from "../context/ThemeProvider";

import {
	Box,
	CssBaseline,
	AppBar,
	Toolbar,
	Typography,
	Drawer,
	List,
	ListItem,
	ListItemButton,
	ListItemIcon,
	ListItemText,
	Divider,
	Stack,
	Dialog,
	DialogTitle,
	DialogContent,
} from "@mui/material";
import TextSnippetOutlinedIcon from "@mui/icons-material/TextSnippetOutlined";
import LabelImportantOutlineRoundedIcon from "@mui/icons-material/LabelImportantOutlineRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import IconButton from "@mui/material/IconButton";
import { createTheme, useTheme } from "@mui/material/styles";
import { ThemeProvider } from "@mui/material/styles";
import CreateLabelDialog from "@/app/(authenticated)/components/CreateLabelDialog";
import { LabelProvider, useLabelContext } from "./context/LabelProvider";
import { NoteProvider } from "@/app/(authenticated)/context/NoteProvider";
import { TableNoteProvider } from "@/app/(authenticated)/context/TableNoteProvider";
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import Brightness2OutlinedIcon from '@mui/icons-material/Brightness2Outlined';
import { SearchWordProvider, useSearchWordContext } from "@/app/(authenticated)/context/SearchWordProvider";
import { SearchLabelProvider, useSearchLabelContext } from "./context/SearchLabelProvider";
import { ScreenSizeProvider, useScreenSizeContext } from "./context/ScreenSizeProvider";
import SearchWordBar from "@/app/(authenticated)/components/SearchWordBar";
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import { Router } from "next/router";
import { usePathname, useRouter } from "next/navigation";
import MenuOutlinedIcon from '@mui/icons-material/MenuOutlined';
import NewLabelOutlinedIcon from '@mui/icons-material/NewLabelOutlined';
import { useTranslation } from "react-i18next";
import ReplayOutlinedIcon from '@mui/icons-material/ReplayOutlined';
import { useSnackbar } from "@/app/(authenticated)/context/SnackbarProvider";
import Image from "next/image";
import { getTokenRefresh, startTokenRefreshInterval, stopTokenRefreshInterval } from "./script/TokenRefresh";
import { AuthProvider, useAuthContext } from "../context/AuthProvider";

const inter = Inter({ subsets: ["latin"] });

type Label = {
	labelname: string,
	id: string,
	createdate: Date
}


const drawerWidthOpen = 180;
const drawerWidthClosed = 60; // アイコンのみの時の幅

export default function AuthenticatedLayout({
	children
}: Readonly<{
	children: React.ReactNode;
}>) {
	const { mode, setMode } = useThemeMode();
	const router = useRouter();
	const theme = useTheme();

	//クライアントサイドでのみテーマを決定する
	React.useEffect(() => {
		const THEME_KEY = process.env.THEME_KEY ? process.env.THEME_KEY : "hoard_theme_mode";
		let determinedMode: "light" | "dark" = "light";

		const stored = window.localStorage.getItem(THEME_KEY);
		if (stored === "dark" || stored === "light") {
			determinedMode = stored;
		} else {
			// 未設定なら OS の設定を参照
			try {
				determinedMode = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
			} catch {
				// 何もしない (デフォルトの"light"が使われる)
			}
		}
		setMode(determinedMode);
	}, []);

	// モードが変わったら localStorage に保存
	React.useEffect(() => {
		if (mode) { // modeがnullでない場合のみ保存
			try {
				const THEME_KEY = process.env.THEME_KEY ? process.env.THEME_KEY : "hoard_theme_mode";
				window.localStorage.setItem(THEME_KEY, mode);
			} catch {
				// なにもしない
			}
		}
	}, [mode]);

	if (!mode) {
		return null;
	}

	return (
		<ThemeProvider theme={theme}>
			<AppRouterCacheProvider>
				<SearchWordProvider>
					<ScreenSizeProvider>
						<SearchLabelProvider>
							<NoteProvider>
								<TableNoteProvider>
									<LabelProvider>
										<InnerLayout>{children}</InnerLayout>
									</LabelProvider>
								</TableNoteProvider>
							</NoteProvider>
						</SearchLabelProvider>
					</ScreenSizeProvider>
				</SearchWordProvider>
			</AppRouterCacheProvider >
		</ThemeProvider >
	);
}

function InnerLayout({ children }: { children: React.ReactNode }) {
	const { labels } = useLabelContext();
	const [labelDialogOpen, setLabelDialogOpen] = React.useState(false);
	const { mode, setMode } = useThemeMode();
	const router = useRouter();
	const theme = useTheme();
	// md (900px) より小さい画面で isSmallScreen が true になる
	const { isSmallScreen, setIsSmallScreen } = useScreenSizeContext();
	React.useEffect(() => {
		const handleResize = () => {
			setIsSmallScreen(window.innerWidth < theme.breakpoints.values.md);
		};
		// 初回判定
		handleResize();
		// リサイズイベントリスナーを追加
		window.addEventListener("resize", handleResize);

		// クリーンアップ
		return () => {
			window.removeEventListener("resize", handleResize);
		};
	}, [theme]);
	const [isDrawerOpen, setIsDrawerOpen] = React.useState(!isSmallScreen);
	const { searchWord, setSearchWord } = useSearchWordContext();
	const { searchLabel, setSearchLabel } = useSearchLabelContext();
	const { t } = useTranslation();
	const { showSnackbar } = useSnackbar();
	const [isLabelSelectDialogOpen, setIsLabelSelectDialogOpen] = React.useState(false);

	const logoHorizontalPadding = { xs: 1, sm: 2 };
	const closedDrawerPaddingRight = logoHorizontalPadding;

	// サイドバー上部のアイコン
	const aboveIcons = [<TextSnippetOutlinedIcon data-testid="noteicon" />, <NewLabelOutlinedIcon data-testid="labelicon" />];
	// サイドバー下部のアイコン
	const belowIcons = [<DeleteOutlineRoundedIcon data-testid="trashicon" />, <SettingsOutlinedIcon data-testid="settingicon" />, <ReplayOutlinedIcon data-testid="reloadicon" />];

	// サイドバー上部
	const navAboveItems = [
		{ text: t("nav_note"), icon: aboveIcons[0], href: "/", onClick: () => { setSearchWord(""); setSearchLabel("") } },
		{ text: t("nav_label"), icon: aboveIcons[1], dialog: true }
	];

	// サイドバー下部
	const navBelowItems = [
		{ text: t("nav_trash"), icon: belowIcons[0], href: "/trash" },
		{ text: t("nav_settings"), icon: belowIcons[1], href: "/settings" }
	];

	// 現在のDrawerの幅をstateとして管理
	const currentDrawerWidth = isDrawerOpen ? drawerWidthOpen : drawerWidthClosed;
	const pathname = usePathname();
	const isActive = (href: string) => {
		if (href === "/") return pathname === "/";
		return pathname.startsWith(href);
	};
	//クライアントサイドでのみテーマを決定する
	React.useEffect(() => {
		const THEME_KEY = process.env.THEME_KEY ? process.env.THEME_KEY : "hoard_theme_mode";
		let determinedMode: "light" | "dark" = "light";

		const stored = window.localStorage.getItem(THEME_KEY);
		if (stored === "dark" || stored === "light") {
			determinedMode = stored;
		} else {
			// 未設定なら OS の設定を参照
			try {
				determinedMode = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
			} catch {
				// 何もしない (デフォルトの"light"が使われる)
			}
		}
		setMode(determinedMode);
	}, []);

	React.useEffect(() => {
		if (isSmallScreen) {
			setIsDrawerOpen(false);
		} else {
			setIsDrawerOpen(true);
		}
	}, [isSmallScreen])

	// モードが変わったら localStorage に保存
	React.useEffect(() => {
		if (mode) { // modeがnullでない場合のみ保存
			try {
				const THEME_KEY = process.env.THEME_KEY ? process.env.THEME_KEY : "hoard_theme_mode";
				window.localStorage.setItem(THEME_KEY, mode);
			} catch {
				// なにもしない
			}
		}
	}, [mode]);

	// トークン自動更新
	React.useEffect(() => {
		startTokenRefreshInterval();

		return () => {
			stopTokenRefreshInterval();
		};
	}, []);

	const toggleColorMode = () => {
		setMode(mode === "light" ? "dark" : "light");
	};

	// ログアウト関数
	const handleLogOut = async () => {
		try {
			const response = await fetch("/api/logout", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				credentials: "include"
			})

			if (response.ok) {
				showSnackbar(t("message_logouted"), "success");
				stopTokenRefreshInterval();
				// ログアウト後はログインページにリダイレクト
				router.push("/login");
			}
		} catch (error) {
			console.error("Logout failed:", error);
			showSnackbar(t("message_failed_to_logout"), "error");
		}
	}

	// リロード関数
	const handleReload = () => {
		window.location.reload();
	};

	if (!mode) {
		return null;
	}

	const LabelSelectDialog = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
		return (
			<Dialog open={open} onClose={onClose}>
				<DialogTitle>{t("label_select_filter_labels")}</DialogTitle>
				<DialogContent>
					{labels.map((label) => {
						const isLabelActive = searchLabel === label.labelname;
						return (
							<ListItem key={label.id} disablePadding>
								<ListItemButton onClick={() => {
									setSearchLabel(label.labelname);
									onClose();
								}} data-testid={`labellistitem-${label.id}`}
									sx={{
										...isLabelActive && {
											bgcolor: "action.selected",
											color: "primary.main"
										}
									}}>
									<ListItemText primary={label.labelname} />
								</ListItemButton>
							</ListItem>
						)
					})}
				</DialogContent>
			</Dialog>
		);
	}
	return (
		<>
			<Box sx={{ display: "flex", paddingTop: 'env(safe-area-inset-top)' }}>
				<CssBaseline />
				<AppBar
					position="fixed"
					sx={{
						zIndex: (theme) => theme.zIndex.drawer + 1,
						backgroundColor: "primary.main",
						transition: theme.transitions.create(["width", "margin"], {
							easing: theme.transitions.easing.sharp,
							duration: theme.transitions.duration.enteringScreen,
						}),
						paddingTop: 'env(safe-area-inset-top)',
					}}
				>
					<Toolbar sx={{
						display: "flex",
						alignItems: "center",
						gap: 2,
						paddingLeft: { xs: 1, sm: 2 },
						paddingRight: { xs: 1, sm: 2 },
					}}>
						<Box sx={{
							flexGrow: { xs: 0, md: 1 },
							flexShrink: 0,
						}}>
							<Box
								sx={{
									height: 55,
									width: 55,
									position: 'relative',
								}}
							>
								<Image
									src="/Hoard_icon.png"
									alt="Hoard Icon"
									fill
									priority
									sizes="55px"
									style={{ objectFit: "contain", objectPosition: "left" }}
								/>
							</Box>

						</Box>
						<Box sx={{ flexGrow: 1, display: "flex", justifyContent: "center" }}>
							<SearchWordBar mode={mode} />
						</Box>
						<Box sx={{
							flexGrow: { xs: 0, md: 1 }, display: "flex",
							justifyContent: "flex-end",
						}} />
						<IconButton
							onClick={toggleColorMode}
							color="inherit"
							data-testid="togglecolormode"
						>
							{mode === "dark" ? <Brightness2OutlinedIcon data-testid="Brightness2OutlinedIcon" /> : <LightModeOutlinedIcon data-testid="LightModeOutlinedIcon" />}
						</IconButton>
						<IconButton
							onClick={handleLogOut}
							color="inherit"
							data-testid="togglecolormode">
							<LogoutOutlinedIcon></LogoutOutlinedIcon>
						</IconButton>
					</Toolbar>
				</AppBar>
				{isSmallScreen ?
					// スマホの場合はドロワーは表示せずに画面下部にメニューを表示する
					<AppBar position="fixed" sx={{
						top: 'auto',
						bottom: 0,
						minHeight: `calc(66px + env(safe-area-inset-bottom))`,
						transition: theme.transitions.create(["width", "margin"], {
							easing: theme.transitions.easing.sharp,
							duration: theme.transitions.duration.enteringScreen,
						}),
					}}>
						<Toolbar sx={{
							display: "flex",
							alignItems: "center",
							gap: 2,
							height: '66px',
							paddingLeft: { xs: 1, sm: 2 },
							paddingRight: { xs: 1, sm: 2 },
							paddingBottom: 'env(safe-area-inset-bottom)',
						}}>
							<Box sx={{ width: '100%' }}>
								<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ width: '100%' }}>
									{navAboveItems.map(({ text, icon, href, dialog, onClick }) => {
										const active = href ? isActive(href) : false;
										return (
											<ListItem key={text} sx={{ flexGrow: 1, display: "flex", justifyContent: "center", px: 0 }}>
												{dialog ? (
													<IconButton onClick={() => setLabelDialogOpen(true)} color="inherit">
														{icon}
													</IconButton>
												) : (
													onClick ? (
														<IconButton component={Link} href={href!} onClick={onClick} color="inherit" sx={{
															...(active && {
																color: "primary.main",
																bgcolor: "action.selected",
																"& .MuiListItemIcon-root": { color: "primary.main" }
															})
														}}>
															{icon}
														</IconButton>
													) : (
														<IconButton component={Link} href={href!} color="inherit">
															{icon}
														</IconButton>
													)
												)}
											</ListItem>
										);
									})}
									<LabelSelectDialog open={isLabelSelectDialogOpen} onClose={() => setIsLabelSelectDialogOpen(false)} data-testid="labelselectdialogbutton" />
									<ListItem sx={{ flexGrow: 1, display: "flex", justifyContent: "center", px: 0 }}>
										<IconButton color="inherit" onClick={() => { setIsLabelSelectDialogOpen(true) }}>
											<LabelImportantOutlineRoundedIcon />
										</IconButton>
									</ListItem>
									{navBelowItems.map(({ text, icon, href }) => {
										const active = href ? isActive(href) : false;
										return (
											<ListItem key={text} sx={{ flexGrow: 1, display: "flex", justifyContent: "center", px: 0 }}>
												<IconButton component={Link} href={href} color="inherit" sx={{
													...(active && {
														color: "primary.main",
														bgcolor: "action.selected",
														"& .MuiListItemIcon-root": { color: "primary.main" }
													})
												}}>
													{icon}
												</IconButton>
											</ListItem>
										)
									})}
									<ListItem sx={{ flexGrow: 1, display: "flex", justifyContent: "center", px: 0 }}>
										<IconButton onClick={handleReload} data-testid="reloadbutton" color="inherit">
											{belowIcons[2]}
										</IconButton>
									</ListItem>
								</Stack>
							</Box>
						</Toolbar>
					</AppBar>
					:
					// 通常の画面ではDrawerを表示
					<Drawer
						variant="permanent"
						open={isDrawerOpen}
						sx={{
							// Drawerの幅を動的に設定
							width: currentDrawerWidth,
							flexShrink: 0,
							[`& .MuiDrawer-paper`]: {
								width: currentDrawerWidth,
								boxSizing: "border-box",
								overflowX: "hidden",
								border: "none",
								transition: theme.transitions.create("width", {
									easing: theme.transitions.easing.sharp,
									duration: theme.transitions.duration.enteringScreen,
								}),
							}
						}}
					>
						<Toolbar />
						<Box sx={{ overflowY: "auto", overflowX: "hidden" }}>
							<List>
								<ListItemButton onClick={() => setIsDrawerOpen(!isDrawerOpen)} sx={{ pl: logoHorizontalPadding }} color="inherit">
									<ListItemIcon sx={{ minWidth: 0, justifyContent: 'center', pl: logoHorizontalPadding }}>
										<MenuOutlinedIcon />
									</ListItemIcon>
								</ListItemButton>
								{navAboveItems.map(({ text, icon, href, dialog, onClick }) => {
									const active = href ? isActive(href) : false;
									return (
										<ListItem key={text} disablePadding>
											{dialog ? (
												<ListItemButton onClick={() => setLabelDialogOpen(true)} sx={{ pl: logoHorizontalPadding }} color="inherit" >
													<ListItemIcon sx={{ minWidth: 0, justifyContent: 'center', px: logoHorizontalPadding }}>
														{icon}
													</ListItemIcon>
													{isDrawerOpen && <ListItemText primary={text} sx={{
														opacity: isDrawerOpen ? 1 : 0,
														whiteSpace: 'nowrap',
														transition: (theme) => theme.transitions.create('opacity', {
															duration: theme.transitions.duration.enteringScreen,
														})
													}} />}
												</ListItemButton>
											) : (
												onClick ? (
													<ListItemButton component={Link} href={href!} onClick={onClick} sx={{
														pl: logoHorizontalPadding, ...(active && {
															color: "primary.main",
															bgcolor: "action.selected",
															"& .MuiListItemIcon-root": { color: "primary.main" }
														})
													}} color="inherit">
														<ListItemIcon sx={{ minWidth: 0, justifyContent: 'center', px: logoHorizontalPadding }}>
															{icon}
														</ListItemIcon>
														{isDrawerOpen && <ListItemText primary={text} sx={{
															opacity: isDrawerOpen ? 1 : 0,
															whiteSpace: 'nowrap',
															transition: (theme) => theme.transitions.create('opacity', {
																duration: theme.transitions.duration.enteringScreen,
															})
														}} />}
													</ListItemButton>
												) : (
													<ListItemButton component={Link} href={href!} sx={{ pl: logoHorizontalPadding }} color="inherit">
														<ListItemIcon sx={{ minWidth: 0, justifyContent: 'center', px: logoHorizontalPadding }}>
															{icon}
														</ListItemIcon>
														{isDrawerOpen && <ListItemText primary={text} sx={{
															opacity: isDrawerOpen ? 1 : 0,
															whiteSpace: 'nowrap',
															transition: (theme) => theme.transitions.create('opacity', {
																duration: theme.transitions.duration.enteringScreen,
															})
														}} />}
													</ListItemButton>
												)
											)}
										</ListItem>
									);
								})}
								{labels.map((label) => {
									const isLabelActive = searchLabel === label.labelname;
									return (
										<ListItem key={label.id} disablePadding>
											<ListItemButton onClick={() => setSearchLabel(label.labelname)} sx={{
												pl: logoHorizontalPadding, ...(isLabelActive && {
													color: "primary.main",
													bgcolor: "action.selected",
													"& .MuiListItemIcon-root": { color: "primary.main" }
												})
											}} data-testid={`labellistitem-${label.id}`} color="inherit">
												<ListItemIcon sx={{ minWidth: 0, justifyContent: "center", px: logoHorizontalPadding }}>
													<LabelImportantOutlineRoundedIcon data-testid={`addedlabelicon-${label.id}`} />
												</ListItemIcon>
												{isDrawerOpen && <ListItemText
													primary={label.labelname}
													sx={{
														opacity: isDrawerOpen ? 1 : 0,
														whiteSpace: "nowrap",
														transition: (theme) =>
															theme.transitions.create("opacity", {
																duration: theme.transitions.duration.enteringScreen,
															}),
													}}
												/>
												}
											</ListItemButton>
										</ListItem>
									)
								})}
							</List>
							<Divider />
							<List>
								{navBelowItems.map(({ text, icon, href }) => {
									const active = href ? isActive(href) : false;
									return (
										<ListItem key={text} disablePadding>
											<ListItemButton component={Link} href={href} sx={{
												pl: logoHorizontalPadding, ...(active && {
													color: "primary.main",
													bgcolor: "action.selected",
													"& .MuiListItemIcon-root": { color: "primary.main" }
												})
											}} color="inherit">
												<ListItemIcon sx={{ minWidth: 0, justifyContent: 'center', px: logoHorizontalPadding }}>
													{icon}
												</ListItemIcon>
												{isDrawerOpen && <ListItemText primary={text} sx={{
													opacity: isDrawerOpen ? 1 : 0,
													whiteSpace: 'nowrap',
													transition: (theme) => theme.transitions.create('opacity', {
														duration: theme.transitions.duration.enteringScreen,
													})
												}} />}
											</ListItemButton>
										</ListItem>
									)
								})}
								<ListItem disablePadding>
									<ListItemButton onClick={handleReload} data-testid="reloadbutton" sx={{ pl: logoHorizontalPadding }} color="inherit">
										<ListItemIcon sx={{ minWidth: 0, justifyContent: 'center', px: logoHorizontalPadding }}>
											{belowIcons[2]}
										</ListItemIcon>
										{isDrawerOpen && <ListItemText primary={t("nav_reload")} sx={{
											opacity: isDrawerOpen ? 1 : 0,
											whiteSpace: 'nowrap',
											transition: (theme) => theme.transitions.create('opacity', {
												duration: theme.transitions.duration.enteringScreen,
											})
										}} />}
									</ListItemButton>
								</ListItem>
							</List>
						</Box>
					</Drawer>}

				<Box component="main" sx={{
					flexGrow: 1, p: 3, width: `calc(100% - ${currentDrawerWidth}px)`,
					overflowX: 'hidden', paddingBottom: {
						xs: `calc(82px + env(safe-area-inset-bottom))`,
						md: 5
					},
				}}>
					<Toolbar />
					{children}
				</Box>
			</Box >
			<CreateLabelDialog open={labelDialogOpen} onClose={() => setLabelDialogOpen(false)} />
		</>
	);
}