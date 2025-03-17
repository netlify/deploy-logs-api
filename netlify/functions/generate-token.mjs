export default async (req, context) => {
  const url = new URL(req.url);
  const siteId = url.searchParams.get("site_id");
  const deployId = url.searchParams.get("deploy_id");
  try {
    const response = await fetch(
      `https://app.netlify.com/access-control/generate-access-control-token?site_id=${siteId}&deploy_id=${deployId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NETLIFY_ACCESS_CONTROL_TOKEN}`,
        },
      }
    );
    const data = await response.json();
    return new Response(JSON.stringify(data));
  } catch (error) {
    console.error(error);
    return new Response("Error generating token", { status: 500 });
  }
};
