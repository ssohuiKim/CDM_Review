<script>
	import tabler from 'yesvelte/css/tabler.min.css?url'
	import { Navbar, NavbarItem, El } from 'yesvelte'
</script>
<svelte:head>
	<link rel='stylesheet' href={tabler}/>
</svelte:head>

<El container bgColor="light" borderBottom style="position: sticky; top: 0;">
	<El row alignItems="center" p='1'>
		<El col="auto" m="3" me="auto" tag="h1">LOGO</El>
		<El col="auto" m="3">
			<El row>
				<El col='auto' px="3">About</El>
				<El col='auto' px="3">Tool</El>
			</El>
		</El>
	</El>
</El>

<slot/>

<El container>
	<El row justifyContent="center" m="2">
		<El col='auto'> This website is maintained by</El>
		<El col='auto' p='0'> <a href="https://pnucolab.com/">Computational Omics Laboratory</a></El>
	</El>
</El>