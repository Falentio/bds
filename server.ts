import { listenAndServe } from "https://deno.land/std@0.120.0/http/server.ts"

interface VersionInfo {
	downloadUrl?: string
	ipfsCid?: string
}

interface Version {
	linux: Record<string, VersionInfo>
	win: Record<string, VersionInfo>
}

const port = +(Deno.env.get("PORT") ?? 8080)
const text = await fetch(new URL("./bdsversion.json", import.meta.url))
	.then(r => r.text())
const version: Version = JSON.parse(text) 

function isValidOs(os: string): os is keyof Version {
	return ["linux", "win"].includes(os)
}

function isValidVer(ver: string): boolean {
	return !/[^0-9\.]/.test(ver)
}

function versionLessThan(x: string, y: string): boolean {
	const a = x.split(".")
	const b = y.split(".")
	if (a.length < b.length) {
		return true
	}
	if (a.length > b.length) {
		return false
	}
	for (const i in a) {
		if (+a[i] < +b[i]) {
			return true
		}
		if (+a[i] > +b[i]) {
			return false
		}
	}
	return true
}

await listenAndServe({ port }, request => {
	const url = new URL(request.url)
	const [, os, ver] = url.pathname.split("/")
	if(!isValidOs(os) || !isValidVer(ver)) {
		return new Response("not found", {
			status: 404
		})
	}
	let matched = ""
	for (const key of Object.keys(version[os])) {
		if (key === ver) {
			matched = key
			break
		}
		if (key.startsWith(ver) && versionLessThan(matched, key)) {
			matched = key
		}
	}
	const result = version[os][matched]?.downloadUrl
	if (!result) {
		return new Response("not found", {
			status: 404
		})
	}
	if (
		url.searchParams.get("redirect") !== null ||
		url.searchParams.get("r") !== null
	) {
		return Response.redirect(result)
	}
	return new Response(result)
})