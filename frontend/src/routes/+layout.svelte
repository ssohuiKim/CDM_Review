<script>
	import tabler from 'yesvelte/css/tabler.min.css?url';
	import { El } from 'yesvelte';
</script>

<svelte:head>
	<link rel='stylesheet' href={tabler}/>
</svelte:head>

<El container style="height: 100%; width: 100%">
	<El container bgColor="light" borderBottom style="position: sticky; top: 0; width: 100%;">
		<El row alignItems="center" p='1' m="0">
			<El col="auto" m="3" me="auto" tag="h1">LOGO</El>
			<El col="auto" m="3">
				<El row>
					<El col='auto' px="3">About</El>
					<El col='auto' px="3">Tool</El>
				</El>
			</El>
		</El>
	</El>

	<El container style="height: 90%; width: 100%">
		<El row p="5" m="0" style="height: 95%;">
			<slot/>
		</El>
		<El row justifyContent="center" m="2" style="height: 5%;">
			<El col='auto' alignSelf="center"> This website is maintained by</El>
			<El col='auto' p='0' alignSelf="center"> <a href="https://pnucolab.com/">Computational Omics Laboratory</a></El>
		</El>
	</El>
</El>